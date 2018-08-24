const _ = require("lodash");
const payload = require("../../fixtures/api-responses/contact-put.json");

module.exports = nock => {
  nock("https://api.aircall.io/")
    .put(/\/v1\/contacts\//)
    .reply(200, payload);
};