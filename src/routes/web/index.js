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
const addressRoute = require("./address.route");
const searchRoute = require("./search.route");
const blogRoute = require("./blog.route");
const preOrderRoute = require("./preOrder.route");
const orderRoute = require("./order.route");
const comboRoute = require("./combo.route");
const shippingRoute = require("./shipping.route");
const pusherRoute = require("./pusher.route");

router.use("/auth", authRoute);
router.use("/collections", collectionRoute);
router.use("/reviews", reviewRoute);
router.use("/products", productRoute);
router.use("/carts", cartRoute);
router.use("/vouchers", voucherRoute);
router.use("/checkout", checkoutRoute);
router.use("/guest-session", guestSessionRoutes);
router.use("/addresses", addressRoute);
router.use("/search", searchRoute);
router.use("/blogs", blogRoute);
router.use("/preorder", preOrderRoute);
router.use("/orders", orderRoute);
router.use("/combos", comboRoute);
router.use("/shipping", shippingRoute);
router.use("/pusher", pusherRoute);

module.exports = router;
