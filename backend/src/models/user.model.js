const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { String },
    facebookId: { String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    progress: {type: Number, default: 0},
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
