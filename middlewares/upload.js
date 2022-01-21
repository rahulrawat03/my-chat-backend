const multer = require("multer");
const MAX_SIZE_IN_B = 524288; // 1024 * 512 = 512kB;

const storage = multer.diskStorage({});

const fileFilter = (req, file, callback) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png")
    return callback(null, true);

  return callback(new Error("Only jpeg and png are allowed"), false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_IN_B,
  },
  fileFilter,
}).single("imageUrl");

module.exports = function (req, res, next) {
  upload(req, res, (err) => {
    if (err) return res.status(400).send(err.message);
    next();
  });
};
