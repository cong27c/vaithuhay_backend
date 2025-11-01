const express = require("express");
const router = express.Router();
const multer = require("multer");
const productImageController = require("@/controllers/api/productImage.controller");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/",
  upload.single("file"),
  productImageController.uploadProductImage
);
router.delete("/:id", productImageController.removeProductImage);

module.exports = router;
