const nodemailer = require('nodemailer');

const SMTP_HOST = "smtp-relay.brevo.com";
const SMTP_PORT = 587;
const SMTP_USER = "9a3bf9001@smtp-brevo.com"; 
const SMTP_PASS = "xsmtpsib-2c68b784f3a53000ae89150b88bf32dc5474f8ba941637d1b2adbd904fbf3bce-VnGlXwxQEDZDFpKI";
const APP_URL = "https://teacher-transfer-backend.onrender.com";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, 
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false 
  }
});

const sendEmail = async (to, subject, message, fromName = "School System") => {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>School System Notification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding:20px;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius:8px; overflow:hidden; border:1px solid #e0e0e0;">
          <tr>
            <td align="center" bgcolor="#2E86C1" style="padding:30px;">
              <h1 style="margin:0; font-size:26px; color:#ffffff; font-weight:normal;">School System</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px; color:#333; font-size:15px; line-height:1.6;">
              <p>Hello,</p>
              <p>${message}</p>
              <p>From: <strong>${fromName}</strong></p>
              <p style="margin:30px 0;">
                <a href="${APP_URL}/login" 
                   style="background:#2E86C1; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:5px; display:inline-block; font-size:15px;">
                  Log in to your account
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px;">
              <hr style="border:none; border-top:1px solid #e0e0e0; margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px; font-size:12px; color:#777; text-align:center;">
              <p style="margin:0;">This is an automated message. Please do not reply.</p>
              <p style="margin:5px 0 0;">&copy; ${new Date().getFullYear()} School System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await transporter.sendMail({
      from: `"School System" <no-reply@school-system.com>`,
      to,
      subject,
      html: htmlTemplate
    });
    console.log("✅ Email sent successfully to:", to);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
  }
};

module.exports = { sendEmail };
