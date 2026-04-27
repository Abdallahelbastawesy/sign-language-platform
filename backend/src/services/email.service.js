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

  const html = `
    <div style="font-family: Arial; text-align: center; padding: 20px;">
      <h2 style="color:#333;">Verify Your Email</h2>
      <p>Welcome to Sign Language Platform 👋</p>
      <p>Click the button below to verify your account:</p>

      <a href="${verificationLink}" 
         style="display:inline-block; margin-top:20px; padding:12px 25px; 
                background-color:#007bff; color:#fff; text-decoration:none; 
                border-radius:5px; font-weight:bold;">
         Verify Email
      </a>

      <p style="margin-top:20px; font-size:12px; color:gray;">
        If you didn’t create an account, you can ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Sign Language Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email",
    html,
  });
};

exports.sendResetPasswordEmail = async (email, resetLink) => {
  const html = `
    <div style="font-family: Arial; text-align: center; padding: 20px;">
      <h2>Reset Your Password</h2>
      <p>Click the button below to reset your password:</p>

      <a href="${resetLink}" 
         style="display:inline-block; margin-top:20px; padding:12px 25px; 
                background-color:#dc3545; color:#fff; text-decoration:none; 
                border-radius:5px;">
         Reset Password
      </a>

      <p style="margin-top:20px; font-size:12px; color:gray;">
        This link will expire in 15 minutes.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Sign Language Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Password",
    html,
  });
};
