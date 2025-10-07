const express = require("express");
const router = express.Router({ mergeParams: true });

const authRoute = require("./auth.route");
const collectionRoute = require("./collection.route");
const productRoute = require("./product.route");
const reviewRoute = require("./review.route");
const cartRoute = require("./cart.route");

router.use("/auth", authRoute);
router.use("/collections", collectionRoute);
router.use("/reviews", reviewRoute);
router.use("/products", productRoute);
router.use("/carts", cartRoute);

module.exports = router;
