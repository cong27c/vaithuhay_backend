"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1️⃣ Lấy 10 sản phẩm đầu tiên có status là coming_soon hoặc pre_order
      const [products] = await queryInterface.sequelize.query(
        `
        SELECT id FROM products 
        WHERE status IN ('coming_soon', 'pre_order') 
        ORDER BY id 
        LIMIT 12
        `
      );

      if (!products.length) {
        console.log("⚠️ Không có sản phẩm nào phù hợp để tạo campaign.");
        return;
      }

      // 2️⃣ Tạo mảng campaign seed
      const now = new Date();
      const campaigns = products.map((p) => {
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30); // Chiến dịch kéo dài 30 ngày

        return {
          product_id: p.id,
          start_date: startDate,
          end_date: endDate,
          status: "upcoming",
          note: "Chiến dịch preorder tự động khởi tạo.",
          created_at: now,
          updated_at: now,
        };
      });

      // 3️⃣ Chèn dữ liệu vào bảng preorder_campaigns
      await queryInterface.bulkInsert("preorder_campaigns", campaigns, {
        transaction,
      });

      await transaction.commit();
      console.log(
        `✅ Đã tạo ${campaigns.length} chiến dịch preorder thành công!`
      );
    } catch (err) {
      await transaction.rollback();
      console.error("❌ Lỗi khi tạo seed preorder_campaign:", err);
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("preorder_campaigns", null, {});
  },
};
