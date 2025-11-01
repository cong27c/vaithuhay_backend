// routes/admin/auth.js
const express = require("express");
const router = express.Router();
const { adminStaffLogin } = require("@/controllers/api/auth.controller");

// POST /admin/auth/login - Cho cả admin và staff
router.post("/login", adminStaffLogin);

module.exports = router;
