const Minihull = require("minihull");
const Hull = require("hull");
const nock = require("nock");
const jwt = require("jwt-simple");

const noop = () => {};

/**
 * This function sets up testing mocks
 */
function mockr({
  server,
  beforeEach,
  afterEach,
  port,
  segments
}) {
  const mocks = {};
  mocks.nock = nock;
  const response = { logs: [], batch: [] };

  const logger = (level, message, data) => {
    response.logs.push({ level, message, data });
  };
  Hull.logger.on("logged", logger);

  beforeEach(done => {
    response.logs = [];
    response.batch = [];

    const minihull = new Minihull();
    mocks.minihull = minihull;
    minihull.listen(8001);
    minihull.stubSegments(segments);
    minihull.userUpdate = ({ connector, messages }, callback = noop) => {
      const t = setTimeout(() => {
        callback(response);
      }, 1800);

      const send = res => {
        clearTimeout(t);
        callback(res);
      };

      mocks.minihull.on("incoming.request@/api/v1/firehose", req => {
        response.batch.push(
          ...req.body.batch.map(r => ({
            ...r,
            claims: jwt.decode(r.headers["Hull-Access-Token"], "", true)
          }))
        );
      });
      minihull
        .smartNotifyConnector(
          connector,
          `http://localhost:${port}/smart-notifier`,
          "user:update",
          messages
        )
        .then(() => {
          send(response);
          // console.log('response came', res)
        });
    };
    mocks.server = server(
      {
        hostSecret: "1234",
        skipSignatureValidation: true,
        Hull,
        port,
        clientConfig: {
          flushAt: 1,
          protocol: "http",
          firehoseUrl: "http://localhost:8001/api/v1/firehose"
        }
      },
      done
    );
  });

  afterEach(() => {
    mocks.minihull.close();
    mocks.server.close();
    mocks.nock.cleanAll();
  });

  return mocks;
};

module.exports = mockr;
