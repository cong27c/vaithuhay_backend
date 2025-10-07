const express = require("express");
const router = express.Router();
const upload = require("@/utils/upload"); // Import utils này
const authJWT = require("@/middlewares/authJWT");

const reviewController = require("@/controllers/web/review.controller");

router.post(
  "/",
  authJWT,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  reviewController.createReview
);

module.exports = router;
