const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management APIs
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all active courses (ordered by stage)
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses
 */
router.get("/", courseController.getAllCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course details with lessons (premium videoUrl hidden if not subscribed)
 *     tags: [Courses]
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
 *         description: Course with lessons list
 *       404:
 *         description: Course not found
 */
router.get("/:id", protect, courseController.getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, stage, stageNumber]
 *             properties:
 *               title:
 *                 type: string
 *                 example: تعلم الحروف
 *               description:
 *                 type: string
 *                 example: أحدث التجارب في تعلم لغة الإشارة
 *               stage:
 *                 type: string
 *                 enum: [basics, letters, words, sentences]
 *               stageNumber:
 *                 type: number
 *                 example: 2
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               thumbnail:
 *                 type: string
 *               isPremium:
 *                 type: boolean
 *               whatYouWillLearn:
 *                 type: array
 *                 items:
 *                   type: string
 *               order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Course created
 *       403:
 *         description: Admin only
 */
router.post("/", protect, adminOnly, courseController.createCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (Admin only)
 *     tags: [Courses]
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
 *         description: Course updated
 *       404:
 *         description: Course not found
 */
router.put("/:id", protect, adminOnly, courseController.updateCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Soft-delete a course (Admin only)
 *     tags: [Courses]
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
 *         description: Course deleted
 *       404:
 *         description: Course not found
 */
router.delete("/:id", protect, adminOnly, courseController.deleteCourse);

module.exports = router;
