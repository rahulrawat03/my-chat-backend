const express = require("express");

const app = express();
require("./start/logging")();
require("./start/validation")();
require("./start/database")();
require("./start/config")();
require("./start/routes")(app);
const server = require("./start/socket")(app);

module.exports = server;
