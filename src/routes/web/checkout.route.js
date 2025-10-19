const express = require("express");
const router = express.Router();
const checkoutController = require("@/controllers/web/checkout.controller");

router.post("/", checkoutController.checkout);

module.exports = router;
