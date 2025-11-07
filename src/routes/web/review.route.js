const express = require("express");
const router = express.Router();
const reviewController = require("@/controllers/web/review.controller");

router.post("/", reviewController.createReview);
router.get("/products/:productId", reviewController.getProductReviews);
module.exports = router;
