/* @flow */
import type {
  THullReqContext,
  THullUserUpdateMessage,
  THullConnector
} from "hull";

import type {
  HullMetrics,
  HullClient,
  HullFieldDropdownItem,
  AircallOutboundMapping,
  AircallConnectorSettings,
  AircallContactUpdateEnvelope,
  FilterUtilConfiguration,
  AircallMappingUtilSettings,
  ServiceClientConfiguration
} from "./types";

const _ = require("lodash");

const FilterUtil = require("./sync-agent/filter-util");
const MappingUtil = require("./sync-agent/mapping-util");
const ServiceClient = require("./service-client");

const CONTACT_FIELDDEFS = require("./sync-agent/contact-fielddefs");

const BASE_API_URL = "https://api.aircall.io/v1";

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
      synchronizedUserSegments: this.normalizedPrivateSettings
        .synchronized_user_segments,
      cache: this.cache
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
      ])
    };
    this.mappingUtil = new MappingUtil(mappingUtilConfiguration);
  }

  normalizeSettings(
    settings: AircallConnectorSettings
  ): AircallConnectorSettings {
    const contactAttrOut: Array<AircallOutboundMapping> = _.get(
      settings,
      "contact_attributes_outbound",
      []
    );
    let contactAttrIn: Array<string> = _.get(
      settings,
      "contact_attributes_inbound",
      []
    );

    contactAttrIn.push("phone_numbers");
    contactAttrIn = _.uniq(contactAttrIn);

    const finalSettings: AircallConnectorSettings = _.cloneDeep(settings);
    finalSettings.contact_attributes_outbound = contactAttrOut;
    finalSettings.contact_attributes_inbound = contactAttrIn;

    return finalSettings;
  }

  getContactFieldOptionsInbound(): Array<HullFieldDropdownItem> {
    const fields = _.filter(CONTACT_FIELDDEFS, { in: true });
    const opts = _.map(fields, f => {
      return { value: f.id, label: f.label };
    });
    return opts;
  }

  getContactFieldOptionsOutbound(): Array<HullFieldDropdownItem> {
    const fields = _.filter(CONTACT_FIELDDEFS, { out: true });
    const opts = _.map(fields, f => {
      return { value: f.id, label: f.label };
    });
    return opts;
  }

  async buildContactUpdateEnvelope(
    message: THullUserUpdateMessage
  ): Promise<AircallContactUpdateEnvelope> {
    const combinedUser = _.cloneDeep(message.user);
    combinedUser.account = _.cloneDeep(message.account);

    const envelope = {};
    envelope.message = message;
    envelope.hullUser = combinedUser;
    envelope.aircallContactRead = null;
    envelope.skipReason = null;
    envelope.error = null;
    envelope.aircallContactWrite = this.mappingUtil.mapHullUserToContact(
      envelope
    );

    return envelope;
  }

  async sendUserMessages(messages: Array<THullUserUpdateMessage>): Promise<*> {
    await this.initialize();

    const deduplicatedMessages = this.filterUtil.deduplicateUserUpdateMessages(
      messages
    );
    const envelopes = await Promise.all(
      deduplicatedMessages.map(message =>
        this.buildContactUpdateEnvelope(message)
      )
    );

    const filterResults = await this.filterUtil.filterUsers(envelopes);

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
            .logger.info("outgoing.user.error", error.message);
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

          await this.hullClient
            .asUser(insertedEnvelope.message.user)
            .traits(
              this.mappingUtil.mapContactToHullUserAttributes(
                insertedEnvelope.aircallContactRead
              )
            );
          await this.cache.set(
            insertedEnvelope.hullUser.id,
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
            .logger.info("outgoing.user.error", error.message);
        }
      })
    );
  }

  isAuthenticationConfigured(): boolean {
    return this.aircallClient.hasValidApiKey();
  }
}

module.exports = SyncAgent;
