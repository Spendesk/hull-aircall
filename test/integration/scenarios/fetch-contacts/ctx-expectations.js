const payloadContacts = require("../../fixtures/api-responses/list-contacts.json");

module.exports = ctxMock => {
  const contactData = payloadContacts.contacts[0];
  const expectedUserIdent = {
    phone: contactData.phone_numbers[0].value,
    anonymous_id: `aircall:${contactData.id}`
  };
  const expectedUserTraits = {
    first_name: {
      value: contactData.first_name,
      operation: "setIfNull",
    },
    last_name: {
      value: contactData.last_name,
      operation: "setIfNull",
    },
    "aircall/id": {
      value: contactData.id,
      operation: "set",
    },
    "aircall/first_name": {
      value: contactData.first_name,
      operation: "set",
    },
    "aircall/last_name": {
      value: contactData.last_name,
      operation: "set",
    },
    "aircall/email_jobs": {
      value: contactData.emails[0].value,
      operation: "set",
    },
    "aircall/email_support": {
      value: contactData.emails[1].value,
      operation: "set",
    },
    "aircall/email_work": {
      value: contactData.emails[2].value,
      operation: "set",
    },
    "aircall/phone_number_amsterdam": {
      value: contactData.phone_numbers[0].value,
      operation: "set",
    },
    "aircall/phone_number_milan": {
      value: contactData.phone_numbers[1].value,
      operation: "set",
    },
    "aircall/phone_number_new_york": {
      value: contactData.phone_numbers[2].value,
      operation: "set",
    },
    "aircall/phone_number_paris": {
      value: contactData.phone_numbers[3].value,
      operation: "set",
    },
    "aircall/phone_number_san_francisco": {
      value: contactData.phone_numbers[4].value,
      operation: "set",
    },
    "aircall/phone_number_sydney": {
      value: contactData.phone_numbers[5].value,
      operation: "set",
    },
    "aircall/phone_number_tokyo": {
      value: contactData.phone_numbers[6].value,
      operation: "set",
    },
  };

  expect(ctxMock.client.asUser.mock.calls[0]).toEqual([expectedUserIdent]);
  expect(ctxMock.client.traits.mock.calls[0]).toEqual([expectedUserTraits]);
}