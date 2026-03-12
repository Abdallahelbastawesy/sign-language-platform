const router = require("express").Router();
const { protect, adminOnly } = require("../middlewares/auth.middleware");
const User = require("../models/user.model");

router.get("/users", protect, adminOnly, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.delete("/user/:id", protect, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

module.exports = router;
