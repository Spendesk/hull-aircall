const _ = require("lodash");
const notifierPayload = _.cloneDeep(
  require("../../fixtures/notifier-payloads/user-update.json")
);

module.exports = () => {
  const userSegmentId = _.get(
    notifierPayload,
    "messages[0].segments[0].id"
  );
  _.set(
    notifierPayload,
    "connector.private_settings.synchronized_user_segments",
    [userSegmentId]
  );

  _.set(
    notifierPayload,
    "connector.private_settings.contact_attributes_outbound",
    [{
      hull_field_name: "phone",
      aircall_field_name: "phone_numbers.work",
    },
    {
      hull_field_name: "first_name",
      aircall_field_name: "first_name",
    }]
  )

  return notifierPayload;
};