const express = require("express");
const router = express.Router();
const blogController = require("@/controllers/web/blog.controller");

// Public routes
router.get("/type/:type", blogController.getBlogByType);
router.get("/:slug", blogController.getBlogBySlug);

module.exports = router;
