/* @flow */
import type { $Response } from "express";

const SyncAgent = require("../lib/sync-agent");

function fetchAction(req: Object, res: $Response): void {
  const syncAgent = new SyncAgent(req.hull);

  res.json({ ok: true });
  syncAgent.fetchUpdatedLeads();
}

module.exports = fetchAction;
