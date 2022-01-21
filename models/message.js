const mongoose = require("mongoose");
const Joi = require("joi");

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  conversationId: { type: mongoose.SchemaTypes.ObjectId, required: true },
  senderId: { type: mongoose.SchemaTypes.ObjectId, required: true },
  senderName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  iv: Buffer,
});

const Message = mongoose.model("Message", messageSchema);

function validate(message) {
  const schema = Joi.object({
    content: Joi.string().min(1).required(),
    conversationId: Joi.objectId().required(),
    senderId: Joi.objectId().required(),
    senderName: Joi.string().min(3).max(50).required(),
  });

  const { error } = schema.validate(message);
  return error;
}

exports.Message = Message;
exports.validate = validate;
