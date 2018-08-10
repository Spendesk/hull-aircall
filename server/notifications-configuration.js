// @flow
import type { THullReqContext, THullUserUpdateMessage } from "hull";

const SyncAgent = require("./lib/sync-agent");

module.exports = {
  "user:update": (
    ctx: THullReqContext,
    messages: Array<THullUserUpdateMessage>
  ) => {
    if (ctx.smartNotifierResponse) {
      ctx.smartNotifierResponse.setFlowControl({
        type: "next",
        in: parseInt(process.env.FLOW_CONTROL_IN, 10) || 1000,
        size: parseInt(process.env.FLOW_CONTROL_SIZE, 10) || 100
      });
    }
    const syncAgent = new SyncAgent(ctx);
    return syncAgent.sendUserUpdateMessages(messages);
  }
};
