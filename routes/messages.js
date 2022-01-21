const router = require("express").Router();
const crypto = require("crypto");
const config = require("config");
const _ = require("lodash");
const { Message, validate } = require("../models/message");
const { Conversation } = require("../models/conversation");
const { User } = require("../models/user");
const auth = require("../middlewares/auth");
const async = require("../middlewares/async");
const objectId = require("../middlewares/objectId");

router.get(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).send("Invalid conversation ID");

    let messages = await Message.find({
      conversationId: req.params.id,
    }).sort({
      createdAt: 1,
    });

    messages = messages.map((message) => {
      const newMessage = _.pick(message, [
        "senderId",
        "senderName",
        "createdAt",
      ]);
      newMessage.content = decrypt(message.content, message.iv);

      return newMessage;
    });

    res.send(messages);
  })
);

router.post(
  "/",
  auth,
  async(async (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const conversation = await Conversation.findById(req.body.conversationId);
    if (!conversation) return res.status(404).send("Invalid conversation ID");

    conversation.lastActive = Date.now();
    await conversation.save();

    conversation.members.forEach(async (m) => {
      const memberId = m._id;

      if (!memberId.equals(req.user._id)) {
        const user = await User.findById(memberId);
        user.conversations = user.conversations.map((c) => {
          if (c._id.equals(conversation._id)) c.unread++;

          return c;
        });

        await user.save();
      }
    });

    const message = new Message(
      _.pick(req.body, ["conversationId", "senderId", "senderName"])
    );

    const { iv, content } = encrypt(req.body.content);
    message.content = content;
    message.iv = iv;

    await message.save();
    res.send(_.pick(message, ["senderId", "senderName"]));
  })
);

function encrypt(message) {
  const algo = config.get("encryptionAlgo");
  const secretKey = config.get("encryptionKey");
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algo, secretKey, iv);
  const encrypted =
    cipher.update(message, "utf-8", "hex") + cipher.final("hex");

  return { iv, content: encrypted };
}

function decrypt(encrypted, iv) {
  const algo = config.get("encryptionAlgo");
  const secretKey = config.get("encryptionKey");

  const decipher = crypto.createDecipheriv(algo, secretKey, iv);
  const decrypted =
    decipher.update(encrypted, "hex", "utf-8") + decipher.final("utf-8");

  return decrypted;
}

module.exports = router;

// Algorithm : aes-256-cbc
