const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription plans and user subscription APIs
 */

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all active subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   nameAr:
 *                     type: string
 *                     example: الخطة السنوية
 *                   price:
 *                     type: number
 *                     example: 300
 *                   currency:
 *                     type: string
 *                     example: EGP
 *                   durationMonths:
 *                     type: number
 *                     example: 12
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get("/plans", subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/plans:
 *   post:
 *     summary: Create a subscription plan (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, nameAr, price, durationMonths]
 *             properties:
 *               name:
 *                 type: string
 *                 example: annual
 *               nameAr:
 *                 type: string
 *                 example: الخطة السنوية
 *               price:
 *                 type: number
 *                 example: 300
 *               currency:
 *                 type: string
 *                 example: EGP
 *               durationMonths:
 *                 type: number
 *                 example: 12
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["كل الكورسات", "تقييم AI", "اختر مستوى"]
 *     responses:
 *       201:
 *         description: Plan created
 */
router.post("/plans", protect, adminOnly, subscriptionController.createPlan);

/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   put:
 *     summary: Update a subscription plan (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Plan updated
 */
router.put("/plans/:id", protect, adminOnly, subscriptionController.updatePlan);

/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   delete:
 *     summary: Deactivate a subscription plan (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan deactivated
 */
router.delete("/plans/:id", protect, adminOnly, subscriptionController.deletePlan);

/**
 * @swagger
 * /api/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe the authenticated user to a plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId]
 *             properties:
 *               planId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 example: visa
 *               paymentReference:
 *                 type: string
 *                 example: TXN_12345
 *     responses:
 *       201:
 *         description: Subscribed successfully
 *       404:
 *         description: Plan not found
 */
router.post("/subscribe", protect, subscriptionController.subscribe);

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     summary: Get current user's subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSubscribed:
 *                   type: boolean
 *                 subscription:
 *                   type: object
 */
router.get("/status", protect, subscriptionController.getStatus);

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel current user's active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       404:
 *         description: No active subscription found
 */
router.post("/cancel", protect, subscriptionController.cancelSubscription);

module.exports = router;
