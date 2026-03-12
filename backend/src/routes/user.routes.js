const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const User = require("../models/user.model");

// تحديث التقدم
router.put("/progress", protect, async (req, res) => {
  try {
    const { progress } = req.body;

    const user = await User.findById(req.user.id);

    user.progress = progress;

    await user.save();

    res.json({
      message: "Progress updated",
      progress: user.progress,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
