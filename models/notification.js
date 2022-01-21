const mongoose = require("mongoose");
const Joi = require("joi");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.SchemaTypes.ObjectId, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("notification", notificationSchema);

function validate(notification) {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    message: Joi.string().required(),
  });

  const { error } = schema.validate(notification);
  return error;
}

module.exports.Notification = Notification;
module.exports.validate = validate;
