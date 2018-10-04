/* @flow */
import type { THullUserUpdateMessage } from "hull";
import type {
  AircallContactUpdateEnvelope,
  FilterResults,
  FilterUtilConfiguration
} from "../types";

const _ = require("lodash");
const Promise = require('bluebird');
class FilterUtil {
  synchronizedUserSegments: Array<string>;
  cache: Object;

  constructor(config: FilterUtilConfiguration) {
    this.synchronizedUserSegments = config.synchronizedUserSegments || [];
    this.cache = config.cache;
  }

  async filterUsers(
    envelopes: Array<AircallContactUpdateEnvelope>
  ): Promise<FilterResults<AircallContactUpdateEnvelope>> {
    const results: FilterResults<AircallContactUpdateEnvelope> = {
      toSkip: [],
      toInsert: [],
      toUpdate: []
    };

    await Promise.each(envelopes, async (envelope: AircallContactUpdateEnvelope) => {
      if (_.isNil(envelope.hullUser.phone)) {
        envelope.skipReason =
          "The Hull account has no value for the unique identifier attribute 'phone'";
        return results.toSkip.push(envelope);
      }

      if (!this.matchesSynchronizedUserSegments(envelope)) {
        envelope.skipReason =
          "The Hull user is not part of any whitelisted segment and won't be synchronized with aircall.io.";
        return results.toSkip.push(envelope);
      }

      const cachedAircallContactId = await this.cache.get(envelope.hullUser.id);
      if (
        _.has(envelope.hullUser, "traits_aircall/id")
        || !_.isNil(cachedAircallContactId)
      ) {
        envelope.aircallContactWrite.id = envelope.hullUser["traits_aircall/id"] || cachedAircallContactId;
        return results.toUpdate.push(envelope);
      }

      return results.toInsert.push(envelope);
    });

    return results;
  }

  matchesSynchronizedUserSegments(
    envelope: AircallContactUpdateEnvelope
  ): boolean {
    const msgSegmentIds: Array<string> = _.get(
      envelope,
      "message.segments",
      []
    ).map(s => s.id);

    if (
      _.intersection(msgSegmentIds, this.synchronizedUserSegments).length > 0
    ) {
      return true;
    }

    return false;
  }

  deduplicateUserUpdateMessages(
    messages: Array<THullUserUpdateMessage>
  ): Array<THullUserUpdateMessage> {
    return _.chain(messages)
      .groupBy("user.id")
      .map(
        (
          groupedMessages: Array<THullUserUpdateMessage>
        ): THullUserUpdateMessage => {
          const dedupedMessage = _.cloneDeep(
            _.last(_.sortBy(groupedMessages, ["user.indexed_at"]))
          );

          const hashedEvents = {};
          groupedMessages.forEach((m: THullUserUpdateMessage) => {
            _.get(m, "events", []).forEach((e: Object) => {
              _.set(hashedEvents, e.event_id, e);
            });
          });

          dedupedMessage.events = _.values(hashedEvents);

          return dedupedMessage;
        }
      )
      .value();
  }
}

module.exports = FilterUtil;
