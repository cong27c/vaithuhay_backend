"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Lấy toàn bộ sản phẩm hiện có
      const [products] = await queryInterface.sequelize.query(`
        SELECT id FROM products;
      `);

      if (!products || products.length === 0) {
        console.log("⚠️  Không có sản phẩm nào trong bảng products.");
        return;
      }

      // Gán trọng lượng ngẫu nhiên
      for (const product of products) {
        const randomWeight = Math.floor(Math.random() * (5000 - 100 + 1)) + 100; // từ 100g đến 5000g
        await queryInterface.bulkUpdate(
          "products",
          { weight: randomWeight },
          { id: product.id },
          {}
        );
      }

      console.log(
        `✅ Đã cập nhật trọng lượng cho ${products.length} sản phẩm.`
      );
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật trọng lượng:", err);
    }
  },

  async down(queryInterface, Sequelize) {
    // Đặt lại weight = 0 nếu cần rollback
    await queryInterface.bulkUpdate("products", { weight: 0 }, {}, {});
    console.log("↩️  Đã reset trọng lượng tất cả sản phẩm về 0.");
  },
};
