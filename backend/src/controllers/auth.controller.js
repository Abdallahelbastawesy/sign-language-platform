const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../services/email.service");

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// دالة توليد كود 6 أرقام
const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateCode();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 دقايق

    await User.create({
      name,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      isEmailVerified: false,
      role: "user",
    });

    try {
      await sendVerificationEmail(email, verificationCode);
      console.log("✅ Verification email sent");
    } catch (err) {
      console.log("❌ Email failed:", err.message);
    }

    res.status(201).json({
      message:
        "User registered. Please check your email for the verification code",
    });
  } catch (error) {
    console.log("❌ Register Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN ================= (بدون تغيير)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isEmailVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15d" },
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("❌ Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= VERIFY EMAIL (بالكود) =================
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Already verified" });
    }

    if (
      user.verificationCode !== code ||
      Date.now() > user.verificationCodeExpires
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.isEmailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    await user.save();

    res.json({ message: "Email verified successfully. You can login now." });
  } catch (error) {
    console.log("❌ Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= RESEND CODE (اختياري - مفيد جداً) =================
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Already verified" });

    const verificationCode = generateCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(email, verificationCode);

    res.json({ message: "Verification code resent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= FORGOT PASSWORD (بالكود) =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetCode = generateCode();

    user.resetPasswordCode = resetCode;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    try {
      await sendResetPasswordEmail(email, resetCode);
      console.log("✅ Reset email sent");
    } catch (err) {
      console.log("❌ Reset email failed:", err.message);
    }

    res.json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.log("❌ Forgot Password Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= RESET PASSWORD (بالكود) =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCode = null;
    user.resetPasswordExpire = null;

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("❌ Reset Password Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= GOOGLE LOGIN ================= (بدون تغيير)
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        isEmailVerified: true,
        role: "user",
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.log("❌ Google Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REFRESH TOKEN ================= (بدون تغيير)
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.json({ accessToken });
  } catch (error) {
    console.log("❌ Refresh Token Error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};
