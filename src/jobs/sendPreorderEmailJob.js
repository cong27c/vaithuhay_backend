"use strict";

const transporter = require("../config/mailer");
const loadEmailTemplate = require("../utils/loadEmailTemplate");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function sendPreorderEmailJob(job) {
  try {
    const { email, type, token, product_id } = JSON.parse(job.payload);
    let url = `${FRONTEND_URL}/preorder/verify?token=${token}`;
    console.log("token", token);

    console.log("url", url);
    const template = await loadEmailTemplate(
      "preorder",
      "preorder/confirmation",
      {
        title: "Xác nhận đăng ký Preorder",
        message: `Cảm ơn bạn đã đăng ký đặt trước sản phẩm #${product_id}`,
        buttonText: "Xem chi tiết",
        url,
      }
    );
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác nhận đăng ký Preorder",
      html: template,
    });

    console.log(`✅ Sent preorder email to ${email}`);
  } catch (err) {
    console.error("❌ sendPreorderEmailJob error:", err);
  }
}

module.exports = sendPreorderEmailJob;
