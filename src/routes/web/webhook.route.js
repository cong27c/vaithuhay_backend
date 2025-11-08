const express = require("express");
const router = express.Router();
const orderController = require("@/controllers/web/order.controller");

router.post("/sepay", orderController.handleWebhookController);

module.exports = router;
