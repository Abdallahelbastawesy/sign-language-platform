const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/refresh", authController.refreshToken);
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/forgotpassword", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
