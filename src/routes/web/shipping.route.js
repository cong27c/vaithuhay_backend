const express = require("express");
const router = express.Router();
const shippingController = require("@/controllers/web/shipping.controller");

router.post("/calculate", shippingController.calculateShipping);
router.get("/methods", shippingController.getMethods);

module.exports = router;
