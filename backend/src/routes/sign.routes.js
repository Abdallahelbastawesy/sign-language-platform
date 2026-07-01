const express = require("express");
const router = express.Router();
const axios = require("axios");

const defaultAiUrl = process.env.VERCEL || process.env.NODE_ENV === "production"
  ? "https://abdallahessam29-sign-language-ai.hf.space"
  : "http://127.0.0.1:7860";
const AI_BASE_URL = (process.env.AI_BASE_URL || defaultAiUrl).replace(/\/$/, "");

router.post("/", async (req, res) => {
  try {
    const { frames } = req.body;

    const response = await axios.post(`${AI_BASE_URL}/predict`, {
      frames,
    });

    res.json(response.data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "AI service error" });
  }
});

module.exports = router;
