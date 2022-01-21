const mongoose = require("mongoose");
const Joi = require("joi");

const conversationSchema = new mongoose.Schema({
  members: { type: [mongoose.SchemaTypes.ObjectId], required: true },
  name: { type: String, maxlength: 50 },
  about: { type: String, minlength: 5, maxlength: 150 },
  imageUrl: String,
  admin: mongoose.SchemaTypes.ObjectId,
  lastActive: { type: Date, default: Date.now },
});

const Conversation = mongoose.model("Conversation", conversationSchema);

function validate(conversation) {
  const schema = Joi.object({
    members: Joi.array().items(Joi.objectId()).min(2).required(),
    name: Joi.string().min(3).max(50),
    admin: Joi.objectId(),
  });

  const { error } = schema.validate(conversation);
  return error;
}

function validateProperties(properties) {
  const schema = Joi.object({
    name: Joi.string().max(50),
    about: Joi.string().min(5).max(150),
    imageUrl: Joi.string(),
    members: Joi.array().items(Joi.objectId()).min(2),
    removeId: Joi.objectId(),
  });

  const { error } = schema.validate(properties);
  return error;
}

exports.Conversation = Conversation;
exports.validate = validate;
exports.validateProperties = validateProperties;
