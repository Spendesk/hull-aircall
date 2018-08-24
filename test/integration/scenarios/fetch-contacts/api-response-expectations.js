const _ = require("lodash");
const payloadContacts = require("../../fixtures/api-responses/list-contacts.json");

module.exports = nock => {
  nock("https://api.aircall.io")
    .get("/v1/contacts/")
    .query({
      per_page: 100,
      page: 0
    })
    .reply(200, payloadContacts);
};