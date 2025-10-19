"use strict";

const cron = require("node-cron");
const PreorderService = require("../services/preorderService");

function startPreorderCron() {
  // Cron chạy mỗi 1 phút cho dev; đổi thành "0 * * * *" (mỗi giờ) hoặc phù hợp cho production
  const schedule =
    process.env.NODE_ENV === "production" ? "0 * * * *" : "*/1 * * * *";

  cron.schedule(
    schedule,
    async () => {
      try {
        console.log(
          "[CRON] Running preorder activation/closing check at",
          new Date().toISOString()
        );
        const result = await PreorderService.closeAndActivateCampaigns();
        console.log("[CRON] Preorder result:", result);
      } catch (err) {
        console.error("[CRON] Error while running preorder cron:", err);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Ho_Chi_Minh", // theo dev yêu cầu mặc định
    }
  );
}

module.exports = startPreorderCron;
