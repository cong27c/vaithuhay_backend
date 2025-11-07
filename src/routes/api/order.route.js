const express = require("express");
const router = express.Router();
const orderController = require("@/controllers/api/order.controller");

// Danh sách routes
router.get("/", orderController.getOrders);
router.get("/search", orderController.searchOrders);
router.get("/stats", orderController.getOrderStats);
router.get("/statuses", orderController.getOrderStatuses);
router.get("/:id", orderController.getOrderDetail);
router.get("/:id/analytics", orderController.getOrderAnalytics);
router.put("/:id/status", orderController.updateOrderStatus);
router.put("/:id/payment", orderController.updatePaymentStatus);
router.put("/:id/shipment", orderController.updateShipmentStatus);
router.put("/:id", orderController.updateOrder);
router.delete("/:id", orderController.deleteOrder);

module.exports = router;
