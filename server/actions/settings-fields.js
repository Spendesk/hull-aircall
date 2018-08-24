/* @flow */
import type { $Response } from "express";
import type { THullRequest } from "hull";

const SyncAgent = require("../lib/sync-agent");

function fieldsContactInbound(req: THullRequest, res: $Response): $Response {
  const syncAgent = new SyncAgent(req.hull);
  return res.json({
    options: syncAgent.getContactFieldOptionsInbound()
  });
}

function fieldsContactOutbound(req: THullRequest, res: $Response): $Response {
  const syncAgent = new SyncAgent(req.hull);
  return res.json({
    options: syncAgent.getContactFieldOptionsOutbound()
  });
}

module.exports = {
  fieldsContactInbound,
  fieldsContactOutbound
};
