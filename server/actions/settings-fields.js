/* @flow */
import type { $Response } from "express";
import type { THullRequest } from "hull";

const _ = require("lodash");

const SyncAgent = require("../lib/sync-agent");

const CONTACT_FIELDDEFS = require("../lib/sync-agent/contact-fielddefs");

function fieldsContactInbound(req: THullRequest, res: $Response): $Response {
  const fields = _.filter(CONTACT_FIELDDEFS, { in: true });
  const options = _.map(fields, f => {
    return { value: f.id, label: f.label };
  });

  return res.json({ options });
}

function fieldsContactOutbound(req: THullRequest, res: $Response): $Response {
  const fields = _.filter(CONTACT_FIELDDEFS, { out: true });
  const options = _.map(fields, f => {
    return { value: f.id, label: f.label };
  });

  return res.json({ options });
}

module.exports = {
  fieldsContactInbound,
  fieldsContactOutbound
};
