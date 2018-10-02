/* @flow */
const Hull = require("hull");
const { Cache } = require("hull/lib/infra");
const RedisStore = require("cache-manager-redis");
const express = require("express");
const { devMode } = require("hull/lib/utils");

const webpackConfig = require("../webpack.config");
const server = require("./server");

const {
  PORT = 8082, SECRET = "1234", REDIS_URL, LOG_LEVEL, NODE_ENV
} = process.env;

if (LOG_LEVEL) {
  Hull.logger.transports.console.level = LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

let cache;
const ttl = 86400 * 30;

if (REDIS_URL) {
  cache = new Cache({
    store: RedisStore,
    url: REDIS_URL,
    compress: true,
    max: 10000,
    ttl,
    isCacheableValue: (value) => {
      if (value && value.error === 103) {
        return false;
      }
      return value !== undefined && value !== null;
    }
  });
} else {
  cache = new Cache({
    store: "memory",
    max: 1000,
    ttl,
    isCacheableValue: (value) => {
      if (value && value.error === 103) {
        return false;
      }
      return value !== undefined && value !== null;
    }
  });
}

const app = express();

if (NODE_ENV === "development") {
  devMode(app, webpackConfig);
}

const connector = new Hull.Connector({
  port: PORT,
  hostSecret: SECRET,
  cache
});

connector.setupApp(app);
server(app);
connector.startApp(app);