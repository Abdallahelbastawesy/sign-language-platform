const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progress.controller");
const { protect } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: User lesson progress tracking APIs
 */

/**
 * @swagger
 * /api/progress/lesson/{lessonId}:
 *   post:
 *     summary: Mark a lesson as completed
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson marked as completed
 *       403:
 *         description: Subscription required for premium lesson
 *       404:
 *         description: Lesson not found
 */
router.post("/lesson/:lessonId", protect, progressController.completeLesson);

/**
 * @swagger
 * /api/progress/course/{courseId}:
 *   get:
 *     summary: Get lesson completion progress for a specific course
 *     tags: [Progress]
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
 *         description: Course progress summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courseId:
 *                   type: string
 *                 title:
 *                   type: string
 *                 totalLessons:
 *                   type: number
 *                 completedLessons:
 *                   type: number
 *                 percentage:
 *                   type: number
 *                   example: 75
 */
router.get("/course/:courseId", protect, progressController.getCourseProgress);

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get all progress across all courses for the current user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress summary per course
 */
router.get("/", protect, progressController.getAllProgress);

module.exports = router;
