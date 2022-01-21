const express = require("express");
const helmet = require("helmet");
const access = require("../middlewares/access");
const messages = require("../routes/messages");
const conversations = require("../routes/conversations");
const users = require("../routes/users");
const auth = require("../routes/auth");
const notifications = require("../routes/notifications");
const preflight = require("../routes/preflight");
const error = require("../middlewares/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(access);
  app.use(helmet());
  app.use("/api/users", users);
  app.use("/api/messages", messages);
  app.use("/api/conversations", conversations);
  app.use("/api/auth", auth);
  app.use("/api/notifications", notifications);
  app.use("/api/*", preflight);
  app.use(error);
};
