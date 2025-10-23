const { PreorderSlot, PreorderTier, CartItem, sequelize } = require("@/models");
const { Op } = require("sequelize");

async function expirePreorderSlots() {
  const t = await sequelize.transaction();
  try {
    // 1️⃣ Lấy các slot đã hết hạn
    const expiredSlots = await PreorderSlot.findAll({
      where: {
        status: "reserved",
        expired_at: { [Op.lt]: new Date() },
      },
      transaction: t,
      lock: true,
    });

    for (const slot of expiredSlots) {
      // 2️⃣ Cập nhật trạng thái slot
      slot.status = "expired";
      await slot.save({ transaction: t });

      // 3️⃣ Giảm reserved_quantity của tier
      if (slot.tier_id) {
        const tier = await PreorderTier.findByPk(slot.tier_id, {
          transaction: t,
          lock: true,
        });
        if (tier && tier.reserved_quantity > 0) {
          tier.reserved_quantity -= 1;
          await tier.save({ transaction: t });
        }
      }

      // 4️⃣ Xóa CartItem liên quan đến slot
      await CartItem.destroy({
        where: { preorder_slot_id: slot.id },
        transaction: t,
      });
    }

    await t.commit();
    console.log(`✅ Đã xử lý ${expiredSlots.length} slot preorder hết hạn.`);
  } catch (error) {
    await t.rollback();
    console.error("❌ Lỗi khi xử lý slot preorder hết hạn:", error);
  }
}

// Nếu dùng cron, ví dụ chạy mỗi 5 phút
// const cron = require("node-cron");

module.exports = { expirePreorderSlots };
