import cron from "node-cron";
import { PreorderRegistration, PreorderCampaign } from "../models";
import { dispatch } from "../queue";
import jwt from "jsonwebtoken";

cron.schedule("* * * * *", async () => {
  // check mỗi phút
  const now = new Date();

  // Lấy tất cả campaign đang 'upcoming' mà start_date <= now
  const campaignsToOpen = await PreorderCampaign.findAll({
    where: {
      status: "upcoming",
      start_date: { [Op.lte]: now },
    },
  });

  for (const campaign of campaignsToOpen) {
    // Cập nhật status sang 'open'
    campaign.status = "open";
    await campaign.save();

    // Lấy các preorder chưa gửi mail
    const preorders = await PreorderRegistration.findAll({
      where: { product_id: campaign.product_id, mail_sent: false },
    });

    for (const preorder of preorders) {
      // Gửi mail
      if (preorder.customer_id) {
        await dispatch("sendPreorderEmailJob", {
          email: preorder.email,
          type: "preorder-customer",
          preorderId: preorder.id,
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
        });
      }

      preorder.mail_sent = true;
      await preorder.save();
    }
  }
});
