const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

// ===== VERIFICATION CODE =====
exports.sendVerificationEmail = async (email, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "كود تفعيل الحساب",
    html: `
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
    `,
  });

  console.log("✅ Verification code sent to:", email);
};

// ===== RESET PASSWORD CODE =====
exports.sendResetPasswordEmail = async (email, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "كود إعادة تعيين كلمة السر",
    html: `
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
    `,
  });

  console.log("✅ Reset code sent to:", email);
};
