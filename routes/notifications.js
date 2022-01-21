const router = require("express").Router();
const { Notification, validate } = require("../models/notification");
const { User } = require("../models/user");
const auth = require("../middlewares/auth");
const async = require("../middlewares/async");
const objectId = require("../middlewares/objectId");

router.get(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const notifications = await Notification.find({
      userId: req.params.id,
    }).sort({ createdAt: -1 });

    res.send(notifications);
  })
);

router.post(
  "/",
  auth,
  async(async (req, res) => {
    const error = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const { userId, message } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(400).send("Invalid user ID");

    user.unreadNotifications++;

    const notification = new Notification({
      userId,
      message,
    });

    await user.save();
    await notification.save();
    res.send(notification._id);
  })
);

router.put(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    if (req.body.clearNotifications)
      await Notification.deleteMany({ userId: req.params.id });
    res.send();
  })
);

router.delete(
  "/:id",
  auth,
  objectId,
  async(async (req, res) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).send("Invalid notification ID");

    res.send(notification._id);
  })
);

module.exports = router;
