const nock = require("nock");
const SyncAgent = require("../../server/lib/sync-agent");
const { ContextMock } = require("./helper/context-mock");

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

  describe("sendUserMessages", () => {
    const scenariosToRun = ["contact-insert", "contact-update"];

    scenariosToRun.forEach(scenarioName => {
      test(`${scenarioName}`, () => {
        const notifierPayload = require(`./scenarios/${scenarioName}/notifier-payload`)();
        ctxMock.connector = notifierPayload.connector;
        ctxMock.ship = notifierPayload.connector;

        const syncAgent = new SyncAgent(ctxMock);

        require(`./scenarios/${scenarioName}/api-response-expectations`)(nock);

        return syncAgent.sendUserMessages(notifierPayload.messages).then(() => {
          require(`./scenarios/${scenarioName}/ctx-expectations`)(ctxMock);
          expect(nock.isDone()).toBe(true);
        });
      });
    });
  });

  describe("fetchUpdatedContacts", () => {
    const scenariosToRun = ["fetch-contacts"];

    scenariosToRun.forEach(scenarioName => {
      test(`${scenarioName}`, () => {
        const schedulerPayload = require(`./scenarios/${scenarioName}/scheduler-payload`)();
        ctxMock.connector = schedulerPayload.connector;
        ctxMock.ship = schedulerPayload.connector;
        const syncAgent = new SyncAgent(ctxMock);
        require(`./scenarios/${scenarioName}/api-response-expectations`)(nock);
        return syncAgent.fetchUpdatedContacts().then(() => {
          require(`./scenarios/${scenarioName}/ctx-expectations`)(ctxMock);
          expect(nock.isDone()).toBe(true);
        });
      });
    });
  });
});
