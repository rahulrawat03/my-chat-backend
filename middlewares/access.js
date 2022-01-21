const config = require("config");

module.exports = function (req, res, next) {
  res
    .header("access-control-allow-origin", config.get("frontendConnection"))
    .header(
      "access-control-allow-headers",
      "origin, x-requested-with, x-auth-token, content-type, accept"
    )
    .header("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
    .header("access-control-expose-headers", "x-auth-token");
  next();
};
