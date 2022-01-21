const winston = require("winston");

module.exports = function () {
  const fileTransport = new winston.transports.File({
    filename: "logging.log",
  });

  winston.exceptions.handle(fileTransport);
  process.on("unhandledRejection", (err) => {
    throw err;
  });

  winston.add(fileTransport);
};
