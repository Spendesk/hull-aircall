const nock = require("nock");
const SyncAgent = require("../../server/lib/sync-agent");
const { ContextMock } = require("./helper/connector-mock");

describe("SyncAgent", () => {
  let ctxMock;

  beforeEach(() => {
    ctxMock = new ContextMock();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("smoke test", () => {
    expect(ctxMock).toBeDefined();
  });
});
