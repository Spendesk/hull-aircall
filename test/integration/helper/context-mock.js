const { ClientMock } = require("./client-mock");
const { ConnectorMock } = require("./connector-mock");

class ContextMock {
  constructor(id = "1234", settings = {}, private_settings = {}) {
    this.ship = new ConnectorMock(id, settings, private_settings);
    this.connector = new ConnectorMock(id, settings, private_settings);
    this.client = new ClientMock();
    this.metric = {
      increment: jest.fn((name, value) => console.log(name, value)),
      value: jest.fn((name, value) => console.log(name, value))
    };
    this.cache = {
      wrap: jest.fn((key, cb) => {
        return Promise.resolve(cb());
      }),
      get: jest.fn(() => {
        return Promise.resolve();
      }),
      set: jest.fn(() => {
        return Promise.resolve();
      })
    };
    this.helpers = {
      updateSettings: () => {
        return Promise.resolve(this.connector);
      }
    };
  }
}

module.exports = { ContextMock };
