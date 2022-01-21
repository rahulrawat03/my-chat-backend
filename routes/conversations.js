const router = require("express").Router();
const _ = require("lodash");
const {
  Conversation,
  validate,
  validateProperties,
} = require("../models/conversation");
const { User } = require("../models/user");
const auth = require("../middlewares/auth");
const async = require("../middlewares/async");
const objectId = require("../middlewares/objectId");
const upload = require("../middlewares/upload");
const cloudinary = require("../middlewares/cloudinary");

router.get(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).send("Invalid conversation ID");

    res.send(conversation);
  })
);

router.post(
  "/",
  auth,
  async(async (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { members, name, admin } = req.body;

    if (!members.includes(admin))
      return res.status(400).send("Admin must be a member");

    const conversation = new Conversation({
      members,
      name,
      admin,
    });

    members.forEach(async (userId) => {
      const user = await User.findById(userId);
      user.conversations.push({ _id: conversation._id, unread: 0 });

      await user.save();
    });

    await conversation.save();
    res.send(_.pick(conversation, ["_id"]));
  })
);

router.put(
  "/:id",
  auth,
  objectId,
  upload,
  async(cloudinary),
  async(async (req, res) => {
    const error = validateProperties(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).send("Invalid conversation ID");

    const { removeId } = req.body;
    if (removeId) await removeMember(conversation, removeId);
    else {
      const err = await adminChanges(req.user._id, conversation, req);
      if (err) return res.status(403).send(err);
    }

    await conversation.save();
    res.send(_.pick(conversation, ["name", "about"]));
  })
);

router.delete(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) return res.status(404).send("Invalid conversation ID");

    for (let member of conversation.members) {
      const user = await User.findById(member);

      user.conversations = user.conversations.filter(
        (c) => !c._id.equals(conversation._id)
      );
      await user.save();
    }

    res.send(conversation);
  })
);

async function adminChanges(userId, conversation, req) {
  if (conversation.admin.toString() !== userId) return "Access Denied";

  const { name, about, members } = req.body;

  if (name) conversation.name = name;
  if (about) conversation.about = about;
  if (req.imageUrl) conversation.imageUrl = req.imageUrl;
  if (members) await manageMembers(conversation, members);
}

async function manageMembers(conversation, members) {
  const convId = conversation._id;
  const oldMembers = new Set(conversation.members);
  const newMembers = new Set(members);

  for (let member in oldMembers) {
    if (!newMembers.has(member)) {
      const user = await User.findById(member);
      user.conversations = user.conversations.filter(
        (c) => !c._id.equals(convId)
      );
      await user.save();
    }
  }

  for (let member in newMembers) {
    if (!oldMembers.has(member)) {
      const user = await User.findById(member);
      user.conversations = user.conversations.push({
        _id: convId,
        unread: 0,
      });
      await user.save();
    }
  }

  conversation.members = members;
}

async function removeMember(conversation, member) {
  const convId = conversation._id;
  const user = await User.findById(member);
  user.conversations = user.conversations.filter((c) => !c._id.equals(convId));

  await user.save();
  conversation.members = conversation.members.filter(
    (m) => m.toString() !== member
  );
}

module.exports = router;
