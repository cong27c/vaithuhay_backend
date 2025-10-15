const express = require("express");
const router = express.Router({ mergeParams: true });

const authRoute = require("./auth.route");
const collectionRoute = require("./collection.route");
const productRoute = require("./product.route");
const reviewRoute = require("./review.route");
const cartRoute = require("./cart.route");
const voucherRoute = require("./voucher.route");
const checkoutRoute = require("./checkout.route");
const guestSessionRoutes = require("./guestSession.route");

router.use("/auth", authRoute);
router.use("/collections", collectionRoute);
router.use("/reviews", reviewRoute);
router.use("/products", productRoute);
router.use("/carts", cartRoute);
router.use("/vouchers", voucherRoute);
router.use("/checkout", checkoutRoute);
router.use("/guest-session", guestSessionRoutes);

module.exports = router;
