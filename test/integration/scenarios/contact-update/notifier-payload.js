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
    "messages[0].user['traits_aircall/id']",
    800777
  );
  _.set(
    notifierPayload,
    "connector.private_settings.synchronized_user_segments",
    [userSegmentId]
  );

  return notifierPayload;
};
