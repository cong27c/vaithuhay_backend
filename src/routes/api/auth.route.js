// routes/admin/auth.js
const express = require("express");
const router = express.Router();
const authController = require("@/controllers/api/auth.controller");

// POST /admin/auth/login - Cho cả admin và staff
router.post("/login", authController.adminStaffLogin);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.adminLogout);

module.exports = router;
