const express = require("express");
const router = express.Router();
const pusherController = require("@/controllers/web/pusher.controller");

// POST /api/v1/pusher/auth
router.post("/auth", pusherController.pusherAuth);

module.exports = router;
