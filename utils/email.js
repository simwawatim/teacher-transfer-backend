const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to, subject, message, fromName = "School System") => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px; border:1px solid #e0e0e0; border-radius:8px;">
      <header style="text-align:center; margin-bottom:30px;">
        <h1 style="color:#2E86C1; font-size:24px; margin:0;">School System Notification</h1>
      </header>
      <p>Hello,</p>
      <p>${message}</p>
      <p>From: <strong>${fromName}</strong></p>
      <p>Please <a href="${process.env.APP_URL}/login" style="color:#2E86C1;">log in</a> to your account.</p>
      <hr style="border-top:1px solid #e0e0e0; margin:30px 0;">
      <footer style="font-size:13px; color:#999; text-align:center;">
        This is an automated message. Do not reply directly.
      </footer>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"School System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlTemplate
    });
  } catch (err) {
    console.error('Email sending failed:', err.message);
  }
};

module.exports = { sendEmail };
