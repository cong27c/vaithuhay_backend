"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 🔹 1️⃣ Lấy danh sách các sản phẩm đang available
      const [availableProducts] = await queryInterface.sequelize.query(
        `
        SELECT id FROM products
        WHERE status = 'available'
        ORDER BY id
        LIMIT 50
        `,
        { transaction }
      );

      if (!availableProducts.length) {
        console.log(
          "⚠️ Không có sản phẩm nào có trạng thái 'available' để cập nhật."
        );
        await transaction.rollback();
        return;
      }

      // 🔹 2️⃣ Chọn ngẫu nhiên 20 sản phẩm trong số đó
      const shuffled = availableProducts.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 20);

      // 🔹 3️⃣ Random mỗi sản phẩm sang pre_order hoặc coming_soon
      const statuses = ["pre_order", "coming_soon"];
      const now = new Date();

      for (const p of selected) {
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        await queryInterface.bulkUpdate(
          "products",
          {
            status: newStatus,
            updated_at: now,
          },
          { id: p.id },
          { transaction }
        );
      }

      await transaction.commit();
      console.log(
        `✅ Đã cập nhật ${selected.length} sản phẩm sang pre_order / coming_soon.`
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Lỗi khi cập nhật trạng thái sản phẩm:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Khôi phục các sản phẩm vừa đổi trở lại "available"
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        UPDATE products
        SET status = 'available', updated_at = NOW()
        WHERE status IN ('pre_order', 'coming_soon')
        `,
        { transaction }
      );
      await transaction.commit();
      console.log("↩️ Đã hoàn tác trạng thái sản phẩm về available.");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Lỗi khi hoàn tác trạng thái sản phẩm:", error);
    }
  },
};
