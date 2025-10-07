const { User } = require("../models");
const { MAIL_SECRET, MAIL_EXPIRES_IN } = require("../config/auth");
const transporter = require("../config/mailer");
const jwtService = require("../services/jwt.service");
const loadEmailTemplate = require("../utils/loadEmailTemplate");

async function sendVerifyEmailJob(job) {
  try {
    const { userId, email, type } = JSON.parse(job.payload);
    let mailToken;

    const { dataValues: user } = await User.findByPk(userId);
    const targetEmail = type === "verify-setting" ? email : user.email;
    if (type == "verify-setting") {
      mailToken = jwtService.generateUpdateEmailToken(
        user.id,
        targetEmail,
        MAIL_SECRET,
        MAIL_EXPIRES_IN
      );
    } else {
      mailToken = jwtService.generateAccessToken(
        user.id,
        MAIL_SECRET,
        MAIL_EXPIRES_IN
      );
    }

    const template = await loadEmailTemplate(
      type,
      "auth/verification",
      mailToken
    );

    await transporter.sendMail({
      from: "nguyenvancongcbg1@gmail.com",
      subject: "Verify email",
      to: targetEmail,
      html: template,
    });
  } catch (error) {
    console.log(error);
  }
}

module.exports = sendVerifyEmailJob;
