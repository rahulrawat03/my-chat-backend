const router = require("express").Router();
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { User } = require("../models/user");
const async = require("../middlewares/async");

router.post(
  "/",
  async(async (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("Invalid email or password.");

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword)
      return res.status(400).send("Invalid email or password");

    const token = user.generateToken();
    res.send(token);
  })
);

function validate(user) {
  const schema = Joi.object({
    email: Joi.string().email().min(3).max(50).required(),
    password: Joi.string().min(8).max(255).required(),
  });

  const { error } = schema.validate(user);
  return error;
}

module.exports = router;
