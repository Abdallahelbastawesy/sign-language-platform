const express = require("express");
const router = express.Router();
const lessonController = require("../controllers/lesson.controller");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Lesson management APIs
 */

/**
 * @swagger
 * /api/lessons/course/{courseId}:
 *   get:
 *     summary: Get all lessons for a course (premium videoUrl hidden if not subscribed)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of lessons
 *       404:
 *         description: Course not found
 */
router.get("/course/:courseId", protect, lessonController.getLessonsByCourse);

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a single lesson (returns 403 if premium and not subscribed)
 *     tags: [Lessons]
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
 *         description: Lesson details
 *       403:
 *         description: Subscription required
 *       404:
 *         description: Lesson not found
 */
router.get("/:id", protect, lessonController.getLessonById);

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a lesson (Admin only)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, title]
 *             properties:
 *               courseId:
 *                 type: string
 *               title:
 *                 type: string
 *                 example: مرحبا
 *               description:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *               duration:
 *                 type: number
 *                 example: 30
 *               order:
 *                 type: number
 *               isPremium:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Lesson created
 */
router.post("/", protect, adminOnly, lessonController.createLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson (Admin only)
 *     tags: [Lessons]
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
 *         description: Lesson updated
 */
router.put("/:id", protect, adminOnly, lessonController.updateLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Soft-delete a lesson (Admin only)
 *     tags: [Lessons]
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
 *         description: Lesson deleted
 */
router.delete("/:id", protect, adminOnly, lessonController.deleteLesson);

module.exports = router;
