const express = require("express");
const router = express.Router();
const orderController = require("@/controllers/web/order.controller");

router.get("/:id", orderController.getOrderById);
router.get("/:id/check-transaction", orderController.checkTransactionExists);
router.get("/reviewable/:productId", orderController.getReviewableOrders);

module.exports = router;
