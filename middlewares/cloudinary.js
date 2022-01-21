const cloudinary = require("cloudinary").v2;
const config = require("config");

cloudinary.config({
  cloud_name: config.get("cloudinaryName"),
  api_key: config.get("cloudinaryApiKey"),
  api_secret: config.get("cloudinaryApiSecret"),
});

module.exports = async function (req, res, next) {
  if (req.file)
    req.imageUrl = (
      await cloudinary.uploader.upload(req.file.path, { folder: "myChat" })
    ).secure_url;
  next();
};
