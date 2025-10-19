// routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const searchController = require("@/controllers/web/search.controller");

router.get("/", searchController.search);
router.get("/hot-topics", searchController.getHotTopics);

module.exports = router;
