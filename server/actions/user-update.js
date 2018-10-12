/* @flow */
import type { TReqContext, THullUserUpdateMessage } from "hull";

const SyncAgent = require("../lib/sync-agent");
const Promise = require("bluebird");

function userUpdate(
  ctx: TReqContext,
  messages: Array<THullUserUpdateMessage>
): Promise<*> {
  ctx.smartNotifierResponse.setFlowControl({
    type: 'next',
    size: 20,
    in: 8000
  })

  const syncAgent = new SyncAgent(ctx);
  return syncAgent.sendUserMessages(messages).catch(err => {
    console.error(">>>> ERROR <<<<", err); // TODO: Add logger
  });
}

module.exports = userUpdate;
