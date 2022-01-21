const router = require("express").Router();
const bcrypt = require("bcrypt");
const Fawn = require("fawn");
const _ = require("lodash");
const { User, validate, validateProperties } = require("../models/user");
const { Conversation } = require("../models/conversation");
const { Message } = require("../models/message");
const auth = require("../middlewares/auth");
const async = require("../middlewares/async");
const upload = require("../middlewares/upload");
const cloudinary = require("../middlewares/cloudinary");
const objectId = require("../middlewares/objectId");
const config = require("config");

Fawn.init(config.get("databaseConnection"));

router.get(
  "/me",
  auth,
  async(async (req, res) => {
    const { _id } = req.user;
    const user = await User.findById(_id).select("-_id -__v -password");

    res.send(user);
  })
);

router.get(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const isOwner = req.params.id === req.user._id;

    let user = await User.findById(req.params.id).select("-__v -password");

    if (!isOwner) user = _.omit(user, ["conversations"]);
    if (!user) return res.status(404).send("User not found (Invalid ID)");

    res.send(user);
  })
);

router.get(
  "/",
  auth,
  async(async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).send("Email was not provided");

    const user = await User.findOne({ email }).select(
      "-__v -password -conversations"
    );

    if (!user) return res.status(404).send("User not found (Invalid ID)");

    res.send(user);
  })
);

router.post(
  "/",
  async(async (req, res) => {
    const error = validate(req.body);
    if (error)
      return res
        .status(400)
        .send({ property: "password", message: error.details[0].message });

    let user = await User.findOne({ email: req.body.email });
    if (user)
      return res
        .status(400)
        .send({ property: "email", message: "Email is already registered" });

    user = await generateHash(req);
    await user.save();

    const token = user.generateToken();
    res.header("x-auth-token", token).send(_.pick(user, ["name", "email"]));
  })
);

router.put(
  "/",
  auth,
  upload,
  async(cloudinary),
  async(async (req, res) => {
    const error = validateProperties(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send("User not found");

    populateProfile(user, req);

    let friend;
    let conversation;
    const { sendId, cancelId, acceptId, rejectId, deleteId } = req.body;

    if (sendId) {
      const { friend: result, err } = await sendRequest(user, sendId);
      if (err) return res.status(err.status).send(err.message);

      friend = result;
    } else if (cancelId) {
      const { friend: result, err } = await cancelRequest(user, cancelId);
      if (err) return res.status(err.status).send(err.message);

      friend = result;
    } else if (acceptId) {
      const {
        friend: result,
        conversation: conv,
        err,
      } = await acceptRequest(user, acceptId);
      if (err) return res.status(err.status).send(err.message);

      friend = result;
      conversation = conv;
    } else if (rejectId) {
      const { friend: result, err } = await rejectRequest(user, rejectId);
      if (err) return res.status(err.status).send(err.message);

      friend = result;
    } else if (deleteId) {
      const {
        friend: result,
        conversation: conv,
        err,
      } = await deleteFriend(user, deleteId);
      if (err) return res.status(err.status).send(err.message);

      friend = result;
      conversation = conv;
    }

    if (friend) {
      handleRequestsTransaction(user, friend);
    } else {
      await user.save();
    }

    res.send(conversation);
  })
);

async function generateHash(req) {
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const user = new User(_.pick(req.body, ["name", "email", "password"]));
  user.password = hashedPassword;
  return user;
}

async function populateProfile(user, req) {
  const {
    status,
    city,
    conversationId,
    unreadNotifications,
    unreadConversation,
  } = req.body;

  if (status) user.status = status;
  if (city) user.city = city;
  if (conversationId)
    user.conversations.push({ _id: conversationId, unread: 0 });
  if (req.imageUrl) user.imageUrl = req.imageUrl;
  if (unreadNotifications) user.unreadNotifications = unreadNotifications;
  if (unreadConversation) {
    user.conversations = user.conversations.map((c) => {
      if (c._id.toString() === unreadConversation) c.unread = 0;
      return c;
    });
  }
}

async function sendRequest(user, sendId) {
  if (user._id.toString() === sendId)
    return { err: { status: 400, message: "Cannot send request to self" } };

  const { friend, err } = await getFriend(
    user.requestsMade,
    sendId,
    true,
    "Request already sent"
  );
  if (err) return { err };

  let response = await getFriend(user.friends, sendId, true, "Already friend");
  if (response.err) return { err: response.err };

  response = await getFriend(
    user.requestsReceived,
    sendId,
    true,
    "Already received request"
  );
  if (response.err) return { err: response.err };

  user.requestsMade = [...user.requestsMade, sendId];
  friend.requestsReceived = [...friend.requestsReceived, user._id];

  return { friend };
}

async function cancelRequest(user, cancelId) {
  const { friend, err } = await getFriend(
    user.requestsMade,
    cancelId,
    false,
    "No such request"
  );
  if (err) return { err };

  user.requestsMade = user.requestsMade.filter(
    (reqId) => reqId.toString() !== cancelId
  );
  friend.requestsReceived = friend.requestsReceived.filter(
    (reqId) => !reqId.equals(user._id)
  );

  return { friend };
}

async function acceptRequest(user, acceptId) {
  const { friend, err } = await getFriend(
    user.requestsReceived,
    acceptId,
    false,
    "No such request"
  );
  if (err) return { err };

  const alreadyFriend = user.friends?.includes(acceptId);
  if (alreadyFriend)
    return { err: { status: 400, message: "User already friend" } };

  user.friends = [...user.friends, acceptId];
  user.requestsReceived = user.requestsReceived.filter(
    (reqId) => reqId.toString() !== acceptId
  );

  friend.friends = [...friend.friends, user._id];
  friend.requestsMade = friend.requestsMade.filter(
    (reqId) => !reqId.equals(user._id)
  );

  const conversation = await createConversation(user, friend);

  return { friend, conversation };
}

async function createConversation(user, friend) {
  const conversation = new Conversation({
    members: [user._id, friend._id],
  });

  const conversationObject = { _id: conversation._id, unread: 0 };

  user.conversations.push(conversationObject);
  friend.conversations.push(conversationObject);

  await conversation.save();
  return conversation;
}

async function rejectRequest(user, rejectId) {
  const { friend, err } = await getFriend(
    user.requestsReceived,
    rejectId,
    false,
    "No such request"
  );
  if (err) return { err };

  user.requestsReceived = user.requestsReceived.filter(
    (reqId) => reqId.toString() !== rejectId
  );
  friend.requestsMade = friend.requestsMade.filter(
    (reqId) => !reqId.equals(user._id)
  );

  return { friend };
}

async function deleteFriend(user, deleteId) {
  const { friend, err } = await getFriend(
    user.friends,
    deleteId,
    false,
    "No such friend"
  );
  if (err) return { err };

  user.friends = user.friends.filter((reqId) => reqId.toString() !== deleteId);
  friend.friends = friend.friends.filter((reqId) => !reqId.equals(user._id));

  const conversation = await deleteConversation(user, friend);

  return { friend, conversation };
}

async function deleteConversation(user, friend) {
  const conversation = await Conversation.findOne({
    members: {
      $size: 2,
      $all: [user._id, friend._id],
    },
  });

  const { _id } = conversation;
  await Conversation.deleteOne({ _id });

  user.conversations = user.conversations.filter((c) => !c._id.equals(_id));
  friend.conversations = friend.conversations.filter((c) => !c._id.equals(_id));

  await Message.deleteMany({ conversationId: _id });
  return conversation;
}

async function getFriend(array, id, checkContainment, customErrorMessage) {
  const contains = array?.includes(id);

  if (checkContainment === contains)
    return { err: { status: 400, message: customErrorMessage } };

  const friend = await User.findById(id);
  if (!friend) return { err: { status: 404, message: "User not found " } };

  return { friend };
}

function handleRequestsTransaction(user, friend) {
  new Fawn.Task()
    .update(
      "users",
      { _id: user._id },
      {
        $set: {
          friends: user.friends,
          requestsMade: user.requestsMade,
          requestsReceived: user.requestsReceived,
          conversations: user.conversations,
        },
      }
    )
    .update(
      "users",
      { _id: friend._id },
      {
        $set: {
          friends: friend.friends,
          requestsMade: friend.requestsMade,
          requestsReceived: friend.requestsReceived,
          conversations: friend.conversations,
        },
      }
    )
    .run();
}

module.exports = router;
