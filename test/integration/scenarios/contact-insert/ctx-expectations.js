const _ = require("lodash");
const notifierPayload = _.cloneDeep(
  require("../../fixtures/notifier-payloads/user-update.json")
);
const apiResponse = _.cloneDeep(
  require("../../fixtures/api-responses/contact-post.json").contact
);

module.exports = ctxMock => {
  const userData = _.get(notifierPayload, "messages[0].user");

  expect(ctxMock.client.asUser.mock.calls[0]).toEqual([userData]);

  const userTraits = {
    "aircall/id": { operation: "set", value: _.get(apiResponse, "id") },
    "aircall/first_name": { operation: "set", value: _.get(apiResponse, "first_name") },
    "aircall/last_name": { operation: "set", value: _.get(apiResponse, "last_name") },
    "aircall/phone_number_amsterdam": { operation: "set", value: _.get(apiResponse, "phone_numbers[0].value") },
    "aircall/phone_number_milan": { operation: "set", value: _.get(apiResponse, "phone_numbers[1].value") },
    "aircall/phone_number_new_york": { operation: "set", value: _.get(apiResponse, "phone_numbers[2].value") },
    "aircall/phone_number_paris": { operation: "set", value: _.get(apiResponse, "phone_numbers[3].value") },
    "aircall/phone_number_san_francisco": { operation: "set", value: _.get(apiResponse, "phone_numbers[4].value") },
    "aircall/phone_number_sydney": { operation: "set", value: _.get(apiResponse, "phone_numbers[5].value") },
    "aircall/phone_number_tokyo": { operation: "set", value: _.get(apiResponse, "phone_numbers[6].value") },
    "aircall/email_jobs": { operation: "set", value: _.get(apiResponse, "emails[0].value") },
    "aircall/email_support": { operation: "set", value: _.get(apiResponse, "emails[1].value") },
    "aircall/email_work": { operation: "set", value: _.get(apiResponse, "emails[2].value") },
    "first_name": { operation: "setIfNull", value: _.get(userData, "first_name") },
    "last_name": { operation: "setIfNull", value: _.get(userData, "last_name") },
  };

  expect(ctxMock.client.traits.mock.calls[0][0]).toEqual(userTraits);

  expect(ctxMock.metric.increment.mock.calls).toHaveLength(1);
  expect(ctxMock.metric.increment.mock.calls[0]).toEqual([
    "ship.service_api.call",
    1,
    [
      "method:POST",
      "url:https://api.aircall.io/v1/contacts/",
      "status:200",
      "statusGroup:2xx",
      "endpoint:POST https://api.aircall.io/v1/contacts/"
    ]
  ]);

  expect(ctxMock.client.logger.debug.mock.calls).toHaveLength(1); // debug calls from super-agent
  expect(ctxMock.client.logger.error.mock.calls).toHaveLength(0);

  expect(ctxMock.client.logger.info.mock.calls).toHaveLength(1);
  expect(ctxMock.client.logger.info.mock.calls[0][0]).toEqual(
    "outgoing.user.success"
  );
};
