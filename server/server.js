/* @flow */
import type { $Application, $Response } from "express";
import type { TRequest } from "hull";

const { smartNotifierHandler } = require("hull/lib/utils");
const bodyParser = require("body-parser");

const notificationsConfiguration = require("./notifications-configuration");
const { webhookHandler, statusCheck } = require("./actions");

function server(app: $Application, { token }: Object): $Application {
  app.get("/admin.html", (req: TRequest, res: $Response) => {
    res.render("admin.html", { hostname: req.hostname, token });
  });

  app.all("/webhook", bodyParser.json(), webhookHandler);

  app.all("/status", statusCheck);

  app.use(
    "/batch",
    smartNotifierHandler({
      userHandlerOptions: {
        groupTraits: false
      },
      handlers: notificationsConfiguration
    })
  );

  app.use(
    "/smart-notifier",
    smartNotifierHandler({
      handlers: notificationsConfiguration
    })
  );

  // you can use object spread syntax
  const a = { a: 1 };
  const b = { b: 2 };
  const c = { ...a, ...b, c: 3 };

  console.log(c);

  // you can use async/await
  async function testAsync() {
    await Promise.resolve();
  }
  testAsync();

  return app;
}

module.exports = server;
