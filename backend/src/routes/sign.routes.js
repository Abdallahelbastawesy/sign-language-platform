const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
  try {
    const { frames } = req.body;

    const response = await axios.post(`${process.env.AI_BASE_URL}/predict`, {
      frames,
    });

    res.json(response.data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "AI service error" });
  }
});

module.exports = router;
