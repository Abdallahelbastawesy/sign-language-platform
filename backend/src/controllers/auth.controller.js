const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../services/email.service");

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      isEmailVerified: false,
    });

    // 🔥 إرسال الإيميل في الخلفية (بدون await)
    sendVerificationEmail(email, verificationToken)
      .then(() => console.log("✅ Verification email sent to:", email))
      .catch((err) => console.log("❌ Email sending failed:", err.message));

    // ⚡ الرد فورًا
    res.status(201).json({
      message: "User registered. Please verify your email",
    });
  } catch (error) {
    console.log("❌ Register Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN =================
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
      { expiresIn: "7d" },
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" },
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

// ================= VERIFY EMAIL =================
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send("✅ Email verified successfully. You can login now.");
  } catch (error) {
    console.log("❌ Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetLink = `${process.env.BASE_URL}/api/auth/reset-password/${resetToken}`;

    // إرسال الإيميل في الخلفية
    sendResetPasswordEmail(email, resetLink)
      .then(() => console.log("✅ Reset email sent"))
      .catch((err) => console.log("❌ Reset email error:", err.message));

    res.json({ message: "Reset password email sent" });
  } catch (error) {
    console.log("❌ Forgot Password Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("❌ Reset Password Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================= GOOGLE LOGIN =================
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.log("❌ Google Login Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= REFRESH TOKEN =================
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
