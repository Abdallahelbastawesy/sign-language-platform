const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const router = express.Router();

// POST /predict - موديل الفيديو
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

// POST /predict-image - موديل الصور
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
