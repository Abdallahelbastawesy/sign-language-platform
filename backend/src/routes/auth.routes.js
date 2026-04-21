const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Login with Google
 *     tags: [Auth]
 */
router.post("/google", authController.googleLogin);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 */
router.post("/refresh", authController.refreshToken);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify user email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/verify-email/:token", authController.verifyEmail);

/**
 * @swagger
 * /api/auth/forgotpassword:
 *   post:
 *     summary: Send reset password email
 *     tags: [Auth]
 */
router.post("/forgotpassword", authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 */
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;
