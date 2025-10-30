require("dotenv").config();
const nodemailer = require("nodemailer");

// === Load environment variables from .env ===
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT, 10);
const EMAIL_USE_TLS = process.env.EMAIL_USE_TLS === 'true';
const EMAIL_USE_SSL = process.env.EMAIL_USE_SSL === 'true';
const EMAIL_HOST_USER = process.env.EMAIL_HOST_USER;
const EMAIL_HOST_PASSWORD = process.env.EMAIL_HOST_PASSWORD;
const APP_URL = process.env.APP_URL;

// === Create Nodemailer transporter using Gmail SMTP ===
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_USE_SSL, // false for TLS
  auth: {
    user: EMAIL_HOST_USER,
    pass: EMAIL_HOST_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // avoid certificate issues
  },
});

// === Verify SMTP connection ===
transporter.verify((error, success) => {
  if (error) console.error("SMTP connection failed:", error.message);
  else console.log("Gmail SMTP server is ready to send emails.");
});

// === Send Email Function (with optional attachments) ===
const sendEmail = async (to, subject, message, attachments = [], fromName = "School System") => {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
<tr>
<td align="center" style="padding:20px;">
<table width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius:8px; border:1px solid #e0e0e0;">
<tr>
<td align="center" bgcolor="#2E86C1" style="padding:30px;">
<h1 style="margin:0; font-size:26px; color:#ffffff;">School System</h1>
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
<p>This is an automated message. Please do not reply.</p>
<p>&copy; ${new Date().getFullYear()} School System</p>
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
    const info = await transporter.sendMail({
      from: `"${fromName}" <${EMAIL_HOST_USER}>`,
      to,
      subject,
      html: htmlTemplate,
      attachments: attachments.map(file => ({
        filename: file.originalname,
        path: file.path,
        contentType: file.mimetype
      }))
    });

    console.log(`Email sent successfully to: ${to}`);
    console.log("Message ID:", info.messageId);
    return { success: true, message: `Email sent to ${to}`, info };
  } catch (err) {
    console.error("Email sending failed:", err.message);
    return { success: false, message: `Failed to send email to ${to}`, error: err.message };
  }
};

module.exports = { sendEmail };
