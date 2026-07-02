const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const defaultAiUrl = process.env.VERCEL || process.env.NODE_ENV === "production"
  ? "https://abdallahessam29-sign-language-ai.hf.space"
  : "http://127.0.0.1:7860";
let rawAiUrl = process.env.AI_BASE_URL || defaultAiUrl;
rawAiUrl = rawAiUrl.trim();
if (rawAiUrl.endsWith("/")) {
  rawAiUrl = rawAiUrl.slice(0, -1);
}
const AI_BASE_URL = rawAiUrl;

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI Model APIs (proxied to FastAPI service)
 */

/**
 * @swagger
 * /api/ai/predict-video:
 *   post:
 *     summary: رفع فيديو مباشر - يتوقع الكلمة من الفيديو
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
 *                   example: شكرا
 *                 confidence:
 *                   type: number
 *                   example: 0.89
 *                 frames_used:
 *                   type: integer
 *                   example: 30
 */
router.post("/predict-video", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "لازم ترفع ملف فيديو في حقل اسمه file" });
  }
  const targetUrl = `${AI_BASE_URL}/predict-video`;
  try {
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const response = await axios.post(
      targetUrl,
      form,
      { headers: form.getHeaders() },
    );
    res.json(response.data);
  } catch (error) {
    console.error("AI Video Error:", error.message);
    res.status(500).json({ 
      error: "AI video service failed",
      details: error.message,
      targetUrl: targetUrl,
      response: error.response?.data
    });
  }
});
/**
 * @swagger
 * /api/ai/predict-image:
 *   post:
 *     summary: Image Sign Model - predict sign from an image
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Prediction result
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
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: AI service error
 */
router.post("/predict-image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_BASE_URL}/predict-image`, form, {
      headers: form.getHeaders(),
    });
    res.json(response.data);
  } catch (error) {
    console.error("AI Predict-Image Error:", error.message);
    res.status(500).json({ error: "AI image service failed" });
  }
});

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Arabic Chatbot - ask a question about the app
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: ما هو الهدف من تطبيق عبر؟
 *     responses:
 *       200:
 *         description: Chatbot response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: تطبيق عَبّر هو رفيقك لكسر حاجز التواصل...
 *                 intent:
 *                   type: string
 *                   example: about_app
 *                 confidence:
 *                   type: number
 *                   example: 0.97
 *       500:
 *         description: AI service error
 */
router.post("/chat", async (req, res) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}/chat`, req.body, {
      timeout: 30000, // 30 second timeout — prevents Swagger hanging forever
    });
    res.json(response.data);
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ error: "AI chat service failed", details: error.message });
  }
});

/**
 * @swagger
 * /api/ai/predict:
 *   post:
 *     summary: LSTM Gesture Model - predict Arabic sign from keypoint frames
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frames]
 *             properties:
 *               frames:
 *                 type: array
 *                 description: Array of 30 frames, each with 126 keypoints
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *     responses:
 *       200:
 *         description: Prediction result
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
 *                   example: 0.91
 *       500:
 *         description: AI service error
 */
router.post("/predict", async (req, res) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}/predict`, req.body, {
      timeout: 30000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("AI Predict Error:", error.message);
    res.status(500).json({ error: "AI predict service failed" });
  }
});


/**
 * @swagger
 * /api/ai/verify-sign:
 *   post:
 *     summary: Sign Verification Model - check if user's sign is correct
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expected_word, frames]
 *             properties:
 *               expected_word:
 *                 type: string
 *                 example: شكرا
 *               frames:
 *                 type: array
 *                 description: Array of 30 frames, each with 126 keypoints
 *                 items:
 *                   type: array
 *                   items:
 *                     type: number
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 correct:
 *                   type: boolean
 *                   example: true
 *                 expected:
 *                   type: string
 *                   example: شكرا
 *                 got:
 *                   type: string
 *                   example: شكرا
 *                 confidence:
 *                   type: number
 *                   example: 94.5
 *       500:
 *         description: AI service error
 */
router.post("/verify-sign", async (req, res) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}/verify-sign`, req.body, {
      timeout: 30000, // 30 second timeout — prevents hanging if AI service is slow
    });
    res.json(response.data);
  } catch (error) {
    console.error("AI Verify-Sign Error:", error.message);
    res.status(500).json({
      error: "AI verify-sign service failed",
      details: error.message,
      response: error.response?.data,
    });
  }
});

/**
 * @swagger
 * /api/ai/predict-voice:
 *   post:
 *     summary: Voice Translation Model - transcribe Arabic speech audio file to text
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transcribed text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                   example: شكرا
 *                 status:
 *                   type: string
 *                   example: success
 *                 matched_text:
 *                   type: string
 *                   example: شكرا
 *                 video_count:
 *                   type: integer
 *                   example: 1
 *                 videos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       order:
 *                         type: integer
 *                         example: 1
 *                       label:
 *                         type: string
 *                         example: شكرا
 *                       filename:
 *                         type: string
 *                         example: شكرا.mp4
 *                       url:
 *                         type: string
 *                         example: https://abdallahessam29-sign-language-ai.hf.space/videos/%D8%B4%D9%83%D8%B1%D8%A7.mp4
 *                 missing_words:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: AI service error
 */
router.post("/predict-voice", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_BASE_URL}/predict-voice`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("AI Predict-Voice Error:", error.message);
    res.status(500).json({
      error: "AI voice service failed",
      details: error.message,
      response: error.response?.data,
    });
  }
});

module.exports = router;
