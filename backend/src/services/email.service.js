const axios = require("axios");

/**
 * Helper to parse sender name and email from standard formatted string
 * e.g. "Sign Language Platform <sender@domain.com>" or just "sender@domain.com"
 */
const parseEmailFrom = (emailFrom) => {
  if (!emailFrom) return { name: "Sign Language Platform", email: "" };
  const match = emailFrom.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Sign Language Platform", email: emailFrom.trim() };
};

/**
 * Sends transactional email via Brevo HTTP API (Port 443)
 * This avoids SMTP port blocking on Vercel serverless instances.
 */
const sendEmailViaBrevo = async (toEmail, subject, htmlContent) => {
  const apiKey = process.env.BREVO_PASS;
  const sender = parseEmailFrom(process.env.EMAIL_FROM);

  if (!apiKey) {
    throw new Error("BREVO_PASS (API Key) is not defined in environment variables");
  }

  const payload = {
    sender,
    to: [{ email: toEmail }],
    subject,
    htmlContent,
  };

  const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  return response.data;
};

// ===== VERIFICATION CODE =====
exports.sendVerificationEmail = async (email, code) => {
  const htmlContent = `
    <div style="font-family: Arial; background:#f4f4f4; padding:40px; text-align:center;">
      <div style="max-width:500px; margin:0 auto; background:#ffffff; padding:30px; border-radius:10px;">
        <h2 style="color:#333;">تفعيل بريدك الإلكتروني</h2>
        <p style="color:#666;">استخدم الكود ده عشان تفعّل حسابك في تطبيق عَبّر</p>
        <div style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#4CAF50; margin:20px 0;">
          ${code}
        </div>
        <p style="color:#999; font-size:12px;">الكود صالح لمدة 10 دقايق</p>
      </div>
    </div>
  `;

  await sendEmailViaBrevo(email, "كود تفعيل الحساب", htmlContent);
  console.log("✅ Verification code sent to:", email);
};

// ===== RESET PASSWORD CODE =====
exports.sendResetPasswordEmail = async (email, code) => {
  const htmlContent = `
    <div style="font-family: Arial; background:#f4f4f4; padding:40px; text-align:center;">
      <div style="max-width:500px; margin:0 auto; background:#ffffff; padding:30px; border-radius:10px;">
        <h2 style="color:#333;">إعادة تعيين كلمة السر</h2>
        <p style="color:#666;">استخدم الكود ده عشان تعمل كلمة سر جديدة</p>
        <div style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#f44336; margin:20px 0;">
          ${code}
        </div>
        <p style="color:#999; font-size:12px;">الكود صالح لمدة 10 دقايق</p>
      </div>
    </div>
  `;

  await sendEmailViaBrevo(email, "كود إعادة تعيين كلمة السر", htmlContent);
  console.log("✅ Reset code sent to:", email);
};
