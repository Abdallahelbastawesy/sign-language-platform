const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 مهم جدًا: إجبار IPv4 بدل IPv6 (بيحل ENETUNREACH)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // مهم مع 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // لازم App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;

  const html = `
    <div>
      <h3>Verify Email</h3>
      <p>Click the link below to verify your account:</p>
      <a href="${verificationLink}">Verify Email</a>
    </div>
  `;

  try {
    console.log("📧 Sending email to:", email);
    console.log("👤 USER:", process.env.EMAIL_USER);
    console.log("🔑 PASS:", process.env.EMAIL_PASS ? "EXISTS" : "MISSING");

    const info = await transporter.sendMail({
      from: `"Sign Language Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Email",
      html,
    });

    console.log("✅ Email sent:", info.response);
  } catch (err) {
    console.error("❌ EMAIL ERROR:", {
      message: err.message,
      code: err.code,
      command: err.command,
    });
  }
};
