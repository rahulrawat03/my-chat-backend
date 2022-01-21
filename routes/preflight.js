const router = require("express").Router();

router.options("/", (req, res) => {
  res.status(200).send();
});

module.exports = router;
