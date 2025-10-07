const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Đây là file", file);
    if (file.fieldname === "images") {
      cb(null, "uploads/images/");
    } else if (file.fieldname === "video") {
      cb(null, "uploads/videos/");
    } else {
      cb(null, "uploads/others/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

module.exports = upload;
