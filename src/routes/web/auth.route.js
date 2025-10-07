const express = require("express");
const router = express.Router();

const authController = require("@/controllers/web/auth.controller");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.get("/verify", authController.verify);
router.get("/check-email", authController.checkEmailExists);
router.post("/reset-password", authController.resetPassword);
router.post("/forgot-password", authController.sendForgotEmail);
router.get("/me", authController.getCurrentUser);

module.exports = router;
