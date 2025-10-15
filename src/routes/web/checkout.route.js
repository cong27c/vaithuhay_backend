const express = require("express");
const router = express.Router();
const checkoutController = require("@/controllers/web/checkout.controller");
const optionalAuth = require("@/middlewares/optionalAuth");

router.post("/", optionalAuth, checkoutController.checkout);

module.exports = router;
