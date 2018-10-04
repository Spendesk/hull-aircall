const {
  fieldsContactInbound,
  fieldsContactOutbound
} = require("./settings-fields");
const statusCheck = require("./status-check");
const userUpdate = require("./user-update");
const adminHandler = require("./admin-handler");

module.exports = {
  fieldsContactInbound,
  fieldsContactOutbound,
  statusCheck,
  userUpdate,
  adminHandler
};
