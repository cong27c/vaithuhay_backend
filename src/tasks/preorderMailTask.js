const { PreorderCampaign, PreorderRegistration } = require("@/models");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const dispatch = require("@/utils/queue");
const MAIL_SECRET = process.env.MAIL_SECRET;

const preorderMailTask = async () => {
  const now = new Date();

  // 🔹 Mở campaign
  const campaignsToOpen = await PreorderCampaign.findAll({
    where: { status: "upcoming", start_date: { [Op.lte]: now } },
  });

  for (const campaign of campaignsToOpen) {
    campaign.status = "open";
    await campaign.save();

    const preorders = await PreorderRegistration.findAll({
      where: { campaign_id: campaign.id, mail_sent: false },
    });

    for (const preorder of preorders) {
      if (preorder.customer_id) {
        await dispatch("sendPreorderEmailJob", {
          email: preorder.email,
          type: "preorder-customer",
          preorderId: preorder.id,
          campaign_id: campaign.id,
        });
      } else {
        const token = jwt.sign(
          {
            guest_session_id: preorder.guest_session_id,
            preorder_id: preorder.id,
          },
          MAIL_SECRET,
          { expiresIn: "7d" }
        );
        await dispatch("sendPreorderEmailJob", {
          email: preorder.email,
          type: "preorder-guest",
          token,
          product_id: preorder.product_id,
          campaign_id: campaign.id,
        });
      }

      preorder.mail_sent = true;
      await preorder.save();
    }
  }

  // 🔹 Đóng campaign đã hết hạn
  const campaignsToClose = await PreorderCampaign.findAll({
    where: { status: "open", end_date: { [Op.lte]: now } },
  });

  for (const campaign of campaignsToClose) {
    campaign.status = "closed";
    await campaign.save();
  }
};

module.exports = preorderMailTask;
