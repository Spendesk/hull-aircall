const {
  fieldsContactInbound,
  fieldsContactOutbound
} = require("./settings-fields");
const statusCheck = require("./status-check");
const userUpdate = require("./user-update");
const fetch = require("./fetch");
const adminHandler = require("./admin-handler");

module.exports = {
  fieldsContactInbound,
  fieldsContactOutbound,
  statusCheck,
  userUpdate,
  fetch,
  adminHandler
};
