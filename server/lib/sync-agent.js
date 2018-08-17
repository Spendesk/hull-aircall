/* @flow */
import type {
  THullReqContext,
  THullUserUpdateMessage,
  THullAccountUpdateMessage,
  THullConnector
} from "hull";

import type {
  HullMetrics,
  HullClient,
  AircallOutboundMapping,
  AircallConnectorSettings,
  AircallSpecialProperty,
  AircallContactWrite,
  AircallContactUpdateEnvelope,
  FilterUtilConfiguration
} from "./types";

const _ = require("lodash");

const FilterUtil = require("./sync-agent/filter-util");
const MappingUtil = require("./sync-agent/mapping-util");
const ServiceClient = require("./service-client");

const pipeStreamToPromise = require("./support/pipe-stream-to-promise");

const BASE_API_URL = "https://api.aircall.io/v1/";

class SyncAgent {
  hullMetric: HullMetrics;
  hullClient: HullClient;
  hullConnector: THullConnector;
  cache: Object;
  helpers: Object;
  normalizedPrivateSettings: AircallConnectorSettings;
  filterUtil: FilterUtil;
  mappingUtil: MappingUtil;
  aircallClient: ServiceClient;

  constructor(reqContext: THullReqContext) {
    this.hullMetric = reqContext.metric;
    this.hullClient = reqContext.client;
    this.hullConnector = reqContext.connector;
    this.cache = reqContext.cache;
    this.helpers = reqContext.helpers;

    const loadedSettings: AircallConnectorSettings = _.get(
      reqContext,
      "ship.private_settings"
    );
    this.normalizedPrivateSettings = this.normalizeSettings(loadedSettings);

    const filterUtilConfiguration: FilterUtilConfiguration = {
      synchronizedUserSegments: this.normalizedPrivateSettings.synchronized_user_segments,
    };
    this.filterUtil = new FilterUtil(filterUtilConfiguration);

    const serviceClientConfiguration: ServiceClientConfiguration = {
      baseApiUrl: BASE_API_URL,
      hullMetric: this.hullMetric,
      hullLogger: this.hullClient.logger,
      apiKey: this.normalizedPrivateSettings.api_key
    };
    this.aircallClient = new ServiceClient(serviceClientConfiguration);
  }

  isInitialized(): boolean {
    return this.mappingUtil instanceof MappingUtil;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized() === true) {
      return;
    }

    const mappingUtilConfiguration: AircallMappingUtilSettings = {
      attributeMappings: _.pick(this.normalizedPrivateSettings, [
        "contact_attributes_outbound",
        "contact_attributes_inbound"
      ]),
    };
    this.mappingUtil = new MappingUtil(mappingUtilConfiguration);
  }

  normalizeSettings(settings: AircallConnectorSettings): AircallConnectorSettings {
    const contactAttrOut: Array<AircallOutboundMapping> = _.get(
      settings,
      "contact_attributes_outbound",
      []
    );
    const contactAttrIn: Array<string> = _.get(
      settings,
      "contact_attributes_inbound",
      []
    );

    if (
      _.find(contactAttrOut, {
        hull_field_name: "phone",
        aircall_field_name: "phone_numbers"
      }) === undefined
    ) {
      contactAttrOut.push({
        hull_field_name: "phone",
        aircall_field_name: "phone_numbers"
      });
    }

    _.uniq(contactAttrIn.push(contactAircallId));

    const finalSettings: AircallConnectorSettings = _.cloneDeep(settings);
    finalSettings.contact_attributes_outbound = contactAttrOut;
    finalSettings.contact_attributes_inbound = contactAttrIn;

    return finalSettings;
  }

  async fetchUpdatedContacts(): Promise<any> {
    await this.initialize();

    const safetyInterval = Duration.fromObject({ minutes: 5 });

    let lastSyncAtRaw = parseInt(
      this.normalizedPrivateSettings.last_sync_at,
      10
    );

    if (_.isNaN(lastSyncAtRaw)) {
      lastSyncAtRaw = Math.floor(
        DateTime.utc()
          .minus({ days: 2 })
          .toMillis() / 1000
      );
    }

    const since = DateTime.fromMillis(lastSyncAtRaw * 1000).minus(
      safetyInterval
    );

    this.hullClient.logger.info("incoming.job.start");

    const streamOfUpdatedContacts = this.serviceClient.getContactsStream();

    return pipeStreamToPromise(streamOfUpdatedContacts, contacts => {
      this.hullClient.logger.info("incoming.job.progress", {
        contacts: contacts.length
      });

      return Promise.all(
        contacts.map(contact => {
          const hullUserIdent = this.mappingUtil.mapContactToHullUserIdent(
            contact
          );
          const hullUserAttributes = this.mappingUtil.mapContactToHullUserAttributes(
            contact
          );

          const asUser = this.hullClient.asUser(hullUserIdent);

          return asUser
            .traits(hullUserAttributes)
            .then(() => {
              asUser.logger.info(
                "incoming.user.success",
                hullUserAttributes
              );
            })
            .catch(error => {
              console.log(error);

              asUser.logger.error("incoming.user.error", error);
            });
        })
      );
    })
    .then(() => {
      this.helpers.updateSettings({
        last_sync_at: Math.floor(DateTime.utc().toMillis() / 1000)
      });

      this.hullClient.logger.info("incoming.job.success");
    })
    .catch(error => {
      this.hullClient.logger.error("incoming.job.error", { reason: error });
    });
  }

  async buildContactUpdateEnvelope(message: THullUserUpdateMessage): Promise<AircallContactUpdateEnvelope> {
    const combinedUser = _.cloneDeep(message.user);
    combinedUser.account = _.cloneDeep(message.account);

    const cachedAircallContactReadId = await this.cache.get(message.user.id);
    
    const envelope = {};
    envelope.message = message;
    envelope.hullUser = combinedUser;
    envelope.aircallContactRead = null;
    envelope.cachedAircallContactReadId = cachedAircallContactReadId || null;
    envelope.skipReason = null;
    envelope.error = null;
    envelope.aircallContactWrite = this.mappingUtil.mapHullUserToContact(envelope);
    
    return envelope;
  }

  sendUserMessages(messages: Array<THullUserUpdateMessage>): Promise<*> {
    await this.initialize();

    const deduplicatedMessages = this.filterUtil.deduplicateUserUpdateMessages(
      messages
    );
    
    const envelopes = await Promise.all(
      deduplicatedMessages.map(message => this.buildUserUpdateEnvelope(message))
    );

    const filterResults = this.filterUtil.filterUsers(envelopes);

    filterResults.toSkip.forEach(envelope => {
      this.hullClient
        .asUser(envelope.message.user)
        .logger.info("outgoing.user.skip", envelope.skipReason);
    });

    const updatedEnvelopes = await this.aircallClient.putContactEnvelopes(
      filterResults.toUpdate
    );

    await Promise.all(
      updatedEnvelopes.map(async updatedEnvelope => {
        try {
          if (updatedEnvelope.aircallContactRead === null) {
            throw new Error(updatedEnvelope.error || "Unkown error");
          }

          const combinedContact = updatedEnvelope.aircallContactRead;

          await this.hullClient
            .asUser(updatedEnvelope.message.user)
            .traits(
              this.mappingUtil.mapContactToHullUserAttributes(combinedContact)
            );
            
          return this.hullClient
            .asUser(updatedEnvelope.message.user)
            .logger.info(
              "outgoing.user.success",
              updatedEnvelope.aircallContactWrite
            );
        } catch (error) {
          return this.hullClient
            .asUser(updatedEnvelope.message.user)
            .logger.info("outgoing.user.error", error);
        }
      })
    );

    const insertedEnvelopes = await this.aircallClient.postContactEnvelopes(
      filterResults.toInsert
    );

    await Promise.all(
      insertedEnvelopes.map(async insertedEnvelope => {
        try {
          if (insertedEnvelope.aircallContactRead === null) {
            throw new Error(insertedEnvelope.error || "Unkown error");
          }

          const combinedContact = insertedEnvelope.aircallContactRead;

          await this.hullClient
            .asUser(insertedEnvelope.message.user)
            .traits(
              this.mappingUtil.mapContactToHullUserAttributes(combinedContact)
            );
          
          await this.cache.set(
            insertedEnvelope.message.id,
            insertedEnvelope.aircallContactRead.id
          );

          return this.hullClient
            .asUser(insertedEnvelope.message.user)
            .logger.info(
              "outgoing.user.success",
              insertedEnvelope.aircallContactWrite
            );
        } catch (error) {
          return this.hullClient
            .asUser(insertedEnvelope.message.user)
            .logger.info("outgoing.user.error", error);
        }
      })
    );
  }

  isAuthenticationConfigured(): boolean {
    return this.aircallClient.hasValidApiKey();
  }
}

module.exports = SyncAgent;
