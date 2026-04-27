const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;

  const html = `<h3>Verify Email</h3>
                <a href="${verificationLink}">Verify</a>`;

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
    console.log("❌ EMAIL ERROR FULL:", err);
  }
};
