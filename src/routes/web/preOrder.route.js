"use strict";

const express = require("express");
const router = express.Router();
const preorderController = require("@/controllers/web/preorder.controller");

// Middlewares you can plug in: auth, validat   ion...
// Example: router.use(authMiddleware);

router.post("/campaigns", preorderController.createCampaign);
router.post("/register", preorderController.register);
router.get("/campaigns", preorderController.getCampaigns);
router.get("/campaigns/:id", preorderController.getCampaignDetail);
router.get("/upcoming", preorderController.getUpcomingCampaigns);
router.get("/preorderCampaigns", preorderController.getPreOrderCampaigns);
router.post("/orders", preorderController.placeOrder);
router.post("/open/add-to-cart", preorderController.addPreorderOpenItem);
router.get("/verify", preorderController.verifyPreorder);

module.exports = router;
