const express = require("express");
const router = express.Router({ mergeParams: true });
const userRoute = require("./user.route");
const websocketRoute = require("./websocket.route");
const voucherRoutes = require("./voucher.route");

router.use("/users", userRoute);
router.use("/pusher", websocketRoute);
router.use("/vouchers", voucherRoutes);

module.exports = router;
