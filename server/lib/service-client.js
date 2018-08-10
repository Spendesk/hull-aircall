/* @flow */
import type { Readable } from "stream";
import type {
  HullMetrics,
  HullClientLogger,
  AircallContactWrite,
  AircallContactRead,
  AircallContactListResponse,
  AircallContactUpdateEnvelope,
  ServiceClientConfiguration
} from "./types";

const _ = require("lodash");
const debug = require("debug")("aircall-connector:service-client");

const superagent = require("superagent");
const SuperagentThrottle = require("superagent-throttle");
const prefixPlugin = require("superagent-prefix");
const promiseToReadableStream = require("./support/promise-to-readable-stream");

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
      .use(prefixPlugin(this.urlPrefix))
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
      .set({ "Content-Type": "application/json" })
      .auth(this.apiKey, "")
      .ok(res => res.status === 200);
  }

  getContacts(per_page: number = 100, page: number = 0): Promise<SuperAgentResponse<AircallContactListResponse>> {
    if (!this.hasValidApiKey()) {
      return Promise.reject(
        new ConfigurationError("No API key specified in the Settings.", {})
      );
    }

    return this.agent.get("/contacts/").query({
      per_page,
      page
    });
  }

  getContactsStream(): Readable {
    return promiseToReadableStream(push => {
      return this.getContacts(100, 0).then(res => {
        push(res.body.contacts);

        const apiOps = [];

        if (res.body.meta.count !== 0) {
          const totalPages = Math.ceil(res.body.meta.total / 100);

          for (let page = 1; page < totalPages; page += 1) {
            apiOps.push(this.getContacts(100, page));
          }
        }

        return Promise.all(apiOps).then(results => {
          results.forEach(result => {
            push(result.body.contacts);
          });
        });
      });
    });
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

    return this.agent.post(`/contacts/${data.id}/`).send(data);
  }

  putContactEnvelopes(envelopes: Array<AircallContactUpdateEnvelope>): Promise<Array<AircallContactUpdateEnvelope>> {
    return Promise.all(
      envelopes.map(envelope => {
        const enrichedEnvelope = _.cloneDeep(envelope);

        return this.putContact(envelope.aircallContactWrite)
          .then(response => {
            enrichedEnvelope.aircallContactRead = response.body;
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
