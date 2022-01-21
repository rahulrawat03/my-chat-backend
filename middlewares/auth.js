const jwt = require("jsonwebtoken");
const config = require("config");
const { User } = require("../models/user");

module.exports = async function (req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access Denied. No token provided.");

  try {
    let user = jwt.verify(token, config.get("jwtSecretKey"));
    req.user = user;

    user = await User.findById(user._id);
    user.lastSeen = Date.now();
    await user.save();

    next();
  } catch (err) {
    res.status(401).send("Invalid token.");
  }
};
