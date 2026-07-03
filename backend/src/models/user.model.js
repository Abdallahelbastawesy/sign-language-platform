const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    facebookId: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    progress: { type: Number, default: 0 },
    isEmailVerified: { type: Boolean, default: false },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    verificationCode: String,
    verificationCodeExpires: Date,

    resetPasswordCode: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
