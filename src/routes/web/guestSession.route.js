const express = require("express");
const router = express.Router();
const guestSessionController = require("@/controllers/web/guestSession.controller");

router.post("/create", guestSessionController.create);

module.exports = router;
