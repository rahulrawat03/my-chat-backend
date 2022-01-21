const config = require("config");

function errorMessage(type) {
  return `FATAL ERROR : ${type} is not defined.`;
}

module.exports = function () {
  if (!config.get("encryptionAlgo")) {
    const message = errorMessage("encryptionAlgo");
    console.log(message);
    throw new Error(message);
  }
  if (!config.get("encryptionKey")) {
    const message = errorMessage("encryptionKey");
    console.log(message);
    throw new Error(message);
  }
  if (!config.get("jwtSecretKey")) {
    const message = errorMessage("jwtSecretKey");
    console.log(message);
    throw new Error(message);
  }
  if (!config.get("databaseConnection")) {
    const message = errorMessage("databaseConnection");
    console.log(message);
    throw new Error(message);
  }
  if (!config.get("frontendConnection")) {
    const message = errorMessage("frontendConnection");
    console.log(message);
    throw new Error(message);
  }
};
