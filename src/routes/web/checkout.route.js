const express = require("express");
const router = express.Router();
const checkoutController = require("@/controllers/web/checkout.controller");

router.post("/", checkoutController.handleCheckout);

module.exports = router;
