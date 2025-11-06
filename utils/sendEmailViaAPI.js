const axios = require('axios');

/**
 * Send an email via external API.
 * @param {Object} options
 * @param {string} options.to - Recipient email.
 * @param {string} options.subject - Email subject.
 * @param {string} options.message - HTML message content.
 * @param {string} [options.header] - Header for the email (default: subject).
 * @param {string} [options.actionUrl] - Optional URL for action button.
 * @param {string} [options.actionText] - Optional text for action button.
 * @param {string} [options.systemName] - System/app name (default: "YourApp").
 * @param {string} [options.supportEmail] - Support email (default: "help@yourapp.com").
 */
async function sendEmailViaAPI({
  to,
  subject,
  message,
  header,
  actionUrl,
  actionText,
  systemName = "YourApp",
  supportEmail = "help@yourapp.com"
}) {
  try {
    const payload = {
      subject,
      message,
      recipient: to,
      header: header || subject,
      action_url: actionUrl || "",
      action_text: actionText || "",
      system_name: systemName,
      support_email: supportEmail
    };

    const response = await axios.post(
      'https://timmails.pythonanywhere.com/api/send-email/',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log("Email API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending email via API:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendEmailViaAPI;
