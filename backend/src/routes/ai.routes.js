const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const router = express.Router();

/**
 * @swagger
 * /api/ai/predict:
 *   post:
 *     summary: موديل الفيديو - يتوقع الكلمة من 30 frame
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               frames:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *                 example: [[0.1, 0.0, 0.05]]
 *     responses:
 *       200:
 *         description: النتيجة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 label:
 *                   type: string
 *                   example: شكرا
 *                 confidence:
 *                   type: number
 *                   example: 0.89
 */
router.post("/predict", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.AI_BASE_URL}/predict`,
      req.body,
    );
    res.json(response.data);
  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "AI service failed" });
  }
});

/**
 * @swagger
 * /api/ai/predict-image:
 *   post:
 *     summary: موديل الصور - يتوقع الكلمة من صورة
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: النتيجة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 label:
 *                   type: string
 *                   example: ممكن
 *                 confidence:
 *                   type: number
 *                   example: 0.92
 */
router.post("/predict-image", async (req, res) => {
  try {
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const response = await axios.post(
      `${process.env.AI_BASE_URL}/predict-image`,
      form,
      { headers: form.getHeaders() },
    );
    res.json(response.data);
  } catch (error) {
    console.error("AI Image Error:", error.message);
    res.status(500).json({ error: "AI image service failed" });
  }
});

module.exports = router;
