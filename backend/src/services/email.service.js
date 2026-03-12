const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

exports.sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;
  await transporter.sendMail({
    from: `"Sign Language Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email",
    html: `<h3>Confirm your email</h3>
           <p>Click below to verify:</p>
           <a href="${verificationLink}">Confirm Email</a>`,
  });
};

exports.sendResetPasswordEmail = async (email, resetLink) => {
  await transporter.sendMail({
    from: `"Sign Language Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html: `<h3>Reset Password</h3>
           <p>Click below to reset your password:</p>
           <a href="${resetLink}">Reset Password</a>`,
  });
};
