const path = require("path");
const ejs = require("ejs");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function loadEmailTemplate(type, template, data) {
  const emailPath = path.join(__dirname, "..", "emails", `${template}.ejs`);

  const token = data.access_token;
  const variables = {
    verify: {
      title: "Verify Your Email",
      message: "Click the button below to verify your email address.",
      buttonText: "Verify Email",
      url: `${FRONTEND_URL}/verify?token=${token}`,
    },
    "forgot-password": {
      title: "Reset Your Password",
      message: "Click the button below to reset your password.",
      buttonText: "Reset Password",
      url: `${FRONTEND_URL}/reset-password?token=${token}`,
    },
    "verify-setting": {
      title: "Verify Your Email",
      message: "Click the button below to reset your password.",
      buttonText: "Verify Email-Setting",
      url: `${FRONTEND_URL}/settings/email/verify?token=${token}`,
    },
  };

  if (!variables[type]) {
    throw new Error(`Invalid template type: ${type}`);
  }

  const finalData = { ...data, ...variables[type] };

  const html = await ejs.renderFile(emailPath, finalData);
  return html;
}

module.exports = loadEmailTemplate;
