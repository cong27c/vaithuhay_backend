const express = require("express");
const router = express.Router({ mergeParams: true });
const userRoute = require("./user.route");
const websocketRoute = require("./websocket.route");
const voucherRoutes = require("./voucher.route");
const authRoutes = require("./auth.route");
const productRoutes = require("./product.route");
const orderRoutes = require("./order.route");

router.use("/users", userRoute);
router.use("/auth", authRoutes);
router.use("/pusher", websocketRoute);
router.use("/vouchers", voucherRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
