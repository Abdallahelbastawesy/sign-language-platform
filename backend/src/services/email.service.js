const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const getBaseUrl = () => process.env.BASE_URL || "http://localhost:5000";

// VERIFY EMAIL
exports.sendVerificationEmail = async (email, token) => {
  const link = `${getBaseUrl()}/api/auth/verify-email/${token}`;

  await resend.emails.send({
    from: "Sign Language App <onboarding@resend.dev>",
    to: email,
    subject: "Verify Your Email",
    html: `
      <div style="font-family: Arial; background:#f4f4f4; padding:40px; text-align:center;">
        <div style="max-width:500px; margin:0 auto; background:#ffffff; padding:30px; border-radius:10px;">
          <h2 style="color:#333;">Verify Your Email</h2>
          <p style="color:#666;">Please confirm your email address to activate your account</p>
          <a href="${link}" style="display:inline-block; padding:12px 25px; background:#4CAF50; color:#fff; text-decoration:none; border-radius:6px; margin-top:15px;">
            Verify Email
          </a>
          <p style="margin-top:20px; font-size:12px; color:#999;">Or copy this link:</p>
          <p style="word-break:break-all; font-size:12px; color:#555;">${link}</p>
        </div>
      </div>
    `,
  });

  console.log("✅ Verification email sent to:", email);
};

// RESET PASSWORD
exports.sendResetPasswordEmail = async (email, token) => {
  const link = `${getBaseUrl()}/api/auth/reset-password/${token}`;

  await resend.emails.send({
    from: "Sign Language App <onboarding@resend.dev>",
    to: email,
    subject: "Reset Password",
    html: `
      <div style="font-family: Arial; background:#f4f4f4; padding:40px; text-align:center;">
        <div style="max-width:500px; margin:0 auto; background:#ffffff; padding:30px; border-radius:10px;">
          <h2 style="color:#333;">Reset Password</h2>
          <p style="color:#666;">Click the button below to reset your password</p>
          <a href="${link}" style="display:inline-block; padding:12px 25px; background:#f44336; color:#fff; text-decoration:none; border-radius:6px; margin-top:15px;">
            Reset Password
          </a>
          <p style="margin-top:20px; font-size:12px; color:#999;">Or copy this link:</p>
          <p style="word-break:break-all; font-size:12px; color:#555;">${link}</p>
        </div>
      </div>
    `,
  });

  console.log("✅ Reset email sent to:", email);
};
