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
  FilterUtilConfiguration
} from "./types";

const _ = require("lodash");

const FilterUtil = require("./sync-agent/filter-util");
const ServiceClient = require("./service-client");

const BASE_API_URL = "https://api.aircall.io/v1/";

class SyncAgent {
  hullMetric: HullMetrics;
  hullClient: HullClient;
  hullConnector: THullConnector;
  cache: Object;
  helpers: Object;
  normalizedPrivateSettings: AircallConnectorSettings;
  filterUtil: FilterUtil;
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

  sendUserUpdateMessages(messages: Array<THullUserUpdateMessage>): Promise<*> {
    return Promise.resolve(messages);
  }
}

module.exports = SyncAgent;
