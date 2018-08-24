const _ = require("lodash");
const payload = require("../../fixtures/api-responses/contact-post.json");

module.exports = nock => {
  nock("https://api.aircall.io/")
    .post(/\/v1\/contacts\//)
    .reply(200, payload);
};