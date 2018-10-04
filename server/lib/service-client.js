/* @flow */
import type {
  HullMetrics,
  HullClientLogger,
  AircallContactWrite,
  AircallContactRead,
  AircallContactUpdateEnvelope,
  ServiceClientConfiguration
} from "./types";

const _ = require("lodash");

const superagent = require("superagent");
const SuperagentThrottle = require("superagent-throttle");

const {
  superagentUrlTemplatePlugin,
  superagentInstrumentationPlugin,
  superagentErrorPlugin
} = require("hull/lib/utils");
const { ConfigurationError } = require("hull/lib/errors");

const throttlePool = {};

class ServiceClient {
  urlPrefix: string;
  hullMetric: HullMetrics;
  hullLogger: HullClientLogger;
  apiKey: string;
  agent: superagent;

  constructor(config: ServiceClientConfiguration) {
    this.urlPrefix = config.baseApiUrl;
    this.hullMetric = config.hullMetric;
    this.hullLogger = config.hullLogger;
    this.apiKey = config.apiKey;

    throttlePool[this.apiKey] =
      throttlePool[this.apiKey] ||
      new SuperagentThrottle({
        rate: parseInt(process.env.THROTTLE_RATE, 10) || 40, // how many requests can be sent every `ratePer`
        ratePer: parseInt(process.env.THROTTLE_RATE_PER, 10) || 1000 // number of ms in which `rate` requests may be sent
      });

    const throttle = throttlePool[this.apiKey];

    this.agent = superagent
      .agent()
      .use(throttle.plugin())
      .redirects(0)
      .use(superagentErrorPlugin({ timeout: 10000 }))
      .use(superagentUrlTemplatePlugin())
      .use(
        superagentInstrumentationPlugin({
          logger: this.hullLogger,
          metric: this.hullMetric
        })
      )
      .on("response", res => {
        const limit = _.get(res.header, "x-aircallapi-limit");
        const remaining = _.get(res.header, "x-aircallapi-remaining");

        if (remaining !== undefined) {
          this.hullMetric.value("ship.service_api.remaining", remaining);
        }

        if (limit !== undefined) {
          this.hullMetric.value("ship.service_api.limit", limit);
        }
      })
      .set({
        "Content-Type": "application/json",
        Authorization: `Basic ${this.apiKey}`
      });
  }

  postContact(data: AircallContactWrite): Promise<AircallContactRead> {
    if (!this.hasValidApiKey()) {
      return Promise.reject(
        new ConfigurationError("No API key specified in the Settings.", {})
      );
    }

    return this.agent.post(`${this.urlPrefix}/contacts/`).send(data);
  }

  putContact(data: AircallContactWrite): Promise<AircallContactRead> {
    if (!this.hasValidApiKey()) {
      return Promise.reject(
        new ConfigurationError("No API key specified in the Settings.", {})
      );
    }

    if (data.id === undefined) {
      return Promise.reject(new Error("Cannot update contact without id"));
    }

    return this.agent.put(`${this.urlPrefix}/contacts/${data.id}/`).send(data);
  }

  postContactEnvelopes(
    envelopes: Array<AircallContactUpdateEnvelope>
  ): Promise<Array<AircallContactUpdateEnvelope>> {
    return Promise.all(
      envelopes.map(envelope => {
        const enrichedEnvelope = _.cloneDeep(envelope);
        return this.postContact(envelope.aircallContactWrite)
          .then(response => {
            enrichedEnvelope.aircallContactRead = response.body.contact;
            return enrichedEnvelope;
          })
          .catch(error => {
            enrichedEnvelope.error = error.response.body;
            return enrichedEnvelope;
          });
      })
    );
  }

  putContactEnvelopes(
    envelopes: Array<AircallContactUpdateEnvelope>
  ): Promise<Array<AircallContactUpdateEnvelope>> {
    return Promise.all(
      envelopes.map(envelope => {
        const enrichedEnvelope = _.cloneDeep(envelope);
        return this.putContact(envelope.aircallContactWrite)
          .then(response => {
            enrichedEnvelope.aircallContactRead = response.body.contact;
            return enrichedEnvelope;
          })
          .catch(error => {
            enrichedEnvelope.error = error.response.body;
            return enrichedEnvelope;
          });
      })
    );
  }

  hasValidApiKey(): boolean {
    if (_.isNil(this.apiKey)) {
      return false;
    }
    if (
      _.isString(this.apiKey) &&
      this.apiKey.length &&
      this.apiKey.length > 5
    ) {
      return true;
    }
    return false;
  }
}

module.exports = ServiceClient;
