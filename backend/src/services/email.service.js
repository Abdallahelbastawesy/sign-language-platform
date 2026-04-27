const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================
// 📩 SEND VERIFICATION EMAIL
// ==========================
exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial;">
      <h2>Verify Your Email</h2>
      <p>Click the button below to verify your account:</p>

      <a href="${verificationLink}" 
         style="display:inline-block;padding:10px 20px;
         background:#4CAF50;color:#fff;text-decoration:none;
         border-radius:5px;">
         Verify Email
      </a>

      <p>If you didn’t request this, ignore this email.</p>
    </div>
  `;

  try {
    console.log("📧 Sending verification email to:", email);

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify Your Email",
      html,
    });

    console.log("✅ Email sent:", data);

    return data;
  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    throw err;
  }
};

// ==========================
// 🔐 SEND RESET PASSWORD EMAIL
// ==========================
exports.sendResetPasswordEmail = async (email, token) => {
  const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial;">
      <h2>Reset Password</h2>
      <p>Click below to reset your password:</p>

      <a href="${resetLink}" 
         style="display:inline-block;padding:10px 20px;
         background:#f44336;color:#fff;text-decoration:none;
         border-radius:5px;">
         Reset Password
      </a>

      <p>This link expires soon.</p>
    </div>
  `;

  try {
    console.log("📧 Sending reset email to:", email);

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset Password",
      html,
    });

    console.log("✅ Reset email sent:", data);

    return data;
  } catch (err) {
    console.error("❌ RESET EMAIL ERROR:", err);
    throw err;
  }
};
