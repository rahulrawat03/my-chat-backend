const mongoose = require("mongoose");
const winston = require("winston");
const config = require("config");

module.exports = function () {
  mongoose
    .connect(config.get("databaseConnection"))
    .then(() => {
      winston.info("Connected to the database");
    })
    .catch((err) => {
      console.log(err.message);
      throw err;
    });
};
