const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { protect, adminOnly } = require("../middlewares/auth.middleware");
const uploadScreenshot = require("../middlewares/upload.middleware");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Manual payment verification APIs (Vodafone Cash & InstaPay)
 */

/**
 * @swagger
 * /api/payments/instructions:
 *   get:
 *     summary: Get manual payment instructions and configuration details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment numbers and addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vodafoneCashNumber:
 *                   type: string
 *                   description: The configured phone number for Vodafone Cash payments.
 *                   example: "01012345678"
 *                 instaPayAddress:
 *                   type: string
 *                   description: The configured account address for InstaPay payments.
 *                   example: "username@instapay"
 *                 instructions:
 *                   type: object
 *                   properties:
 *                     vodafoneCash:
 *                       type: string
 *                       example: "للدفع عبر فودافون كاش، قم بتحويل المبلغ إلى الرقم 01012345678 ثم قم برفع لقطة شاشة للعملية هنا."
 *                     instaPay:
 *                       type: string
 *                       example: "للدفع عبر إنستا باي، قم بالتحويل إلى العنوان username@instapay ثم قم برفع لقطة شاشة للعملية هنا."
 *       401:
 *         description: Unauthorized (Token is missing or invalid)
 */
router.get("/instructions", protect, paymentController.getPaymentInstructions);

/**
 * @swagger
 * /api/payments/upload:
 *   post:
 *     summary: Upload receipt screenshot (Max 5MB, JPG/PNG/WEBP/GIF)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [screenshot]
 *             properties:
 *               screenshot:
 *                 type: string
 *                 format: binary
 *                 description: Screenshot of the payment receipt.
 *     responses:
 *       200:
 *         description: Image uploaded successfully and URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File uploaded successfully"
 *                 imageUrl:
 *                   type: string
 *                   description: Public URL of the uploaded receipt image.
 *                   example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *                 filename:
 *                   type: string
 *                   example: "screenshot-1783090803161.png"
 *       400:
 *         description: File validation failed (invalid format or file size exceeded)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid file type. Only JPEG, JPG, PNG, WEBP, and GIF are allowed."
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload",
  protect,
  uploadScreenshot.single("screenshot"),
  paymentController.uploadScreenshot
);

/**
 * @swagger
 * /api/payments/request:
 *   post:
 *     summary: Submit a new manual payment verification request (Pending status)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod, screenshot]
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: ID of the Course (use if purchasing a specific course).
 *                 example: "60c72b2f9b1d8a23c8802901"
 *               planId:
 *                 type: string
 *                 description: ID of the Subscription Plan (use if purchasing a subscription).
 *                 example: "60c72b2f9b1d8a23c8802902"
 *               paymentMethod:
 *                 type: string
 *                 enum: ["Vodafone Cash", "InstaPay"]
 *                 description: The channel used to send the payment.
 *                 example: "Vodafone Cash"
 *               senderPhone:
 *                 type: string
 *                 description: The sender phone number (optional, useful for Vodafone Cash).
 *                 example: "01099998888"
 *               screenshot:
 *                 type: string
 *                 description: Receipt URL previously returned by the upload endpoint.
 *                 example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *               note:
 *                 type: string
 *                 description: Additional notes or information from the sender.
 *                 example: "يرجى التفعيل في أقرب وقت لحسابي"
 *     responses:
 *       201:
 *         description: Payment request created and submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "تم إرسال طلب الدفع بنجاح وهو قيد المراجعة الآن"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802905"
 *                     user:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802900"
 *                     course:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802901"
 *                     subscriptionPlan:
 *                       type: string
 *                       example: null
 *                     paymentMethod:
 *                       type: string
 *                       example: "Vodafone Cash"
 *                     senderPhone:
 *                       type: string
 *                       example: "01099998888"
 *                     screenshot:
 *                       type: string
 *                       example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *                     note:
 *                       type: string
 *                       example: "يرجى التفعيل في أقرب وقت لحسابي"
 *                     status:
 *                       type: string
 *                       example: "Pending"
 *                     createdAt:
 *                       type: string
 *                       example: "2026-07-03T18:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       example: "2026-07-03T18:00:00.000Z"
 *       400:
 *         description: Validation failed (missing required parameters, invalid paymentMethod)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Must provide either courseId or planId"
 *       404:
 *         description: Referenced Course or SubscriptionPlan not found
 *       401:
 *         description: Unauthorized
 */
router.post("/request", protect, paymentController.submitPaymentRequest);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get authenticated user's manual payment request history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's payment requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "60c72b2f9b1d8a23c8802905"
 *                   status:
 *                     type: string
 *                     example: "Pending"
 *                   paymentMethod:
 *                     type: string
 *                     example: "Vodafone Cash"
 *                   senderPhone:
 *                     type: string
 *                     example: "01099998888"
 *                   screenshot:
 *                     type: string
 *                     example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *                   note:
 *                     type: string
 *                     example: "يرجى التفعيل في أقرب وقت لحسابي"
 *                   course:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60c72b2f9b1d8a23c8802901"
 *                       title:
 *                         type: string
 *                         example: "دورة لغة الإشارة المتقدمة"
 *                   subscriptionPlan:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60c72b2f9b1d8a23c8802902"
 *                       nameAr:
 *                         type: string
 *                         example: "الخطة السنوية"
 *                   createdAt:
 *                     type: string
 *                     example: "2026-07-03T18:00:00.000Z"
 *       401:
 *         description: Unauthorized
 */
router.get("/history", protect, paymentController.getPaymentHistory);

/**
 * @swagger
 * /api/payments/status/{id}:
 *   get:
 *     summary: Get status of a specific manual payment request by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment request ID
 *         example: "60c72b2f9b1d8a23c8802905"
 *     responses:
 *       200:
 *         description: Detailed payment request status and information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "60c72b2f9b1d8a23c8802905"
 *                 status:
 *                   type: string
 *                   example: "Approved"
 *                 paymentMethod:
 *                   type: string
 *                   example: "Vodafone Cash"
 *                 screenshot:
 *                   type: string
 *                   example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *                 reviewedBy:
 *                   type: string
 *                   example: "60c72b2f9b1d8a23c8802999"
 *                 reviewedAt:
 *                   type: string
 *                   example: "2026-07-03T18:05:00.000Z"
 *       404:
 *         description: Request not found or user is not authorized to view it
 *       401:
 *         description: Unauthorized
 */
router.get("/status/:id", protect, paymentController.getPaymentStatus);

// ================= ADMIN ROUTES =================

/**
 * @swagger
 * /api/payments/admin/requests:
 *   get:
 *     summary: Get list of payment requests, optionally filtered by status (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter payment requests by status. Returns all if omitted.
 *         example: "Pending"
 *     responses:
 *       200:
 *         description: List of payment requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "60c72b2f9b1d8a23c8802905"
 *                   status:
 *                     type: string
 *                     example: "Pending"
 *                   paymentMethod:
 *                     type: string
 *                     example: "Vodafone Cash"
 *                   user:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60c72b2f9b1d8a23c8802900"
 *                       name:
 *                         type: string
 *                         example: "Abdallah"
 *                       email:
 *                         type: string
 *                         example: "user@test.com"
 *                   course:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: "دورة لغة الإشارة المتقدمة"
 *                   createdAt:
 *                     type: string
 *                     example: "2026-07-03T18:00:00.000Z"
 *       403:
 *         description: Forbidden (Admin privileges required)
 *       401:
 *         description: Unauthorized
 */
router.get("/admin/requests", protect, adminOnly, paymentController.adminGetPendingPayments);

/**
 * @swagger
 * /api/payments/admin/requests/{id}:
 *   get:
 *     summary: Get full details of a specific payment request (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment request ID
 *         example: "60c72b2f9b1d8a23c8802905"
 *     responses:
 *       200:
 *         description: Detailed payment request info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "60c72b2f9b1d8a23c8802905"
 *                 status:
 *                   type: string
 *                   example: "Pending"
 *                 senderPhone:
 *                   type: string
 *                   example: "01099998888"
 *                 screenshot:
 *                   type: string
 *                   example: "http://localhost:5000/uploads/screenshot-1783090803161.png"
 *                 note:
 *                   type: string
 *                   example: "يرجى التفعيل"
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Abdallah"
 *                     email:
 *                       type: string
 *                       example: "user@test.com"
 *       404:
 *         description: Request not found
 *       403:
 *         description: Forbidden (Admin only)
 *       401:
 *         description: Unauthorized
 */
router.get("/admin/requests/:id", protect, adminOnly, paymentController.adminGetPaymentDetails);

/**
 * @swagger
 * /api/payments/admin/requests/{id}/approve:
 *   post:
 *     summary: Approve a payment request, granting user course or plan access (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment request ID
 *         example: "60c72b2f9b1d8a23c8802905"
 *     responses:
 *       200:
 *         description: Payment request approved, status updated, and access granted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment approved and access granted successfully"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802905"
 *                     status:
 *                       type: string
 *                       example: "Approved"
 *                     reviewedBy:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802999"
 *                     reviewedAt:
 *                       type: string
 *                       example: "2026-07-03T18:05:00.000Z"
 *       400:
 *         description: The payment is already processed (not in Pending status)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment is already Approved"
 *       404:
 *         description: Request not found
 *       403:
 *         description: Forbidden (Admin only)
 *       401:
 *         description: Unauthorized
 */
router.post("/admin/requests/:id/approve", protect, adminOnly, paymentController.adminApprovePayment);

/**
 * @swagger
 * /api/payments/admin/requests/{id}/reject:
 *   post:
 *     summary: Reject a payment request (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment request ID
 *         example: "60c72b2f9b1d8a23c8802905"
 *     responses:
 *       200:
 *         description: Payment request rejected and status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment request rejected successfully"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802905"
 *                     status:
 *                       type: string
 *                       example: "Rejected"
 *                     reviewedBy:
 *                       type: string
 *                       example: "60c72b2f9b1d8a23c8802999"
 *                     reviewedAt:
 *                       type: string
 *                       example: "2026-07-03T18:05:00.000Z"
 *       400:
 *         description: The payment is already processed (not in Pending status)
 *       404:
 *         description: Request not found
 *       403:
 *         description: Forbidden (Admin only)
 *       401:
 *         description: Unauthorized
 */
router.post("/admin/requests/:id/reject", protect, adminOnly, paymentController.adminRejectPayment);

module.exports = router;
