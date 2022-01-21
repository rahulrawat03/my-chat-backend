const mongoose = require("mongoose");
const Joi = require("joi");
const JoiPasswordComplexity = require("joi-password-complexity");
const jwt = require("jsonwebtoken");
const config = require("config");

const conversationSchema = new mongoose.Schema({
  unread: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: { type: String, required: true, minlength: 8, maxlength: 255 },
  conversations: { type: [conversationSchema], default: [] },
  imageUrl: String,
  status: { type: String, minlength: 3, maxlength: 100 },
  city: { type: String, minlength: 3, maxlength: 20 },
  lastSeen: { type: Date, default: Date.now },
  friends: [mongoose.SchemaTypes.ObjectId],
  requestsMade: [mongoose.SchemaTypes.ObjectId],
  requestsReceived: [mongoose.SchemaTypes.ObjectId],
  unreadNotifications: { type: Number, default: 0 },
});

userSchema.methods.generateToken = function () {
  return jwt.sign(
    { _id: this._id, name: this.name },
    config.get("jwtSecretKey")
  );
};

const User = mongoose.model("User", userSchema);

function validate(user) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required().label("Name"),
    email: Joi.string().email().required().label("Email"),
    password: new JoiPasswordComplexity().required().label("Password"),
  });

  const { error } = schema.validate(user);
  return error;
}

function validateProperties(properties) {
  const schema = Joi.object({
    status: Joi.string().min(3).max(100),
    city: Joi.string().min(3).max(20),
    imageUrl: Joi.string(),
    conversationId: Joi.objectId(),
    sendId: Joi.objectId(),
    cancelId: Joi.objectId(),
    acceptId: Joi.objectId(),
    rejectId: Joi.objectId(),
    deleteId: Joi.objectId(),
    unreadNotifications: Joi.number().min(0),
    unreadConversation: Joi.objectId(),
  });

  const { error } = schema.validate(properties);
  return error;
}

exports.User = User;
exports.validate = validate;
exports.validateProperties = validateProperties;
