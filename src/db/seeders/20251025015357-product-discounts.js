"use strict";

const { Op } = require("sequelize");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Lấy 150 sản phẩm đầu tiên
    const [products] = await queryInterface.sequelize.query(`
      SELECT id FROM products 
      ORDER BY id 
      LIMIT 150
    `);

    if (!products.length) {
      console.log("⚠️ Không có sản phẩm nào để tạo giảm giá!");
      return;
    }

    // Lấy ngày hiện tại và ngày sau 30 ngày
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + 30);

    // Chọn ngẫu nhiên 60% sản phẩm
    const discountCount = Math.floor(products.length * 0.6);
    const shuffled = products.sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, discountCount);

    // Tạo dữ liệu giảm giá
    const discounts = selectedProducts.map((p) => {
      const randomValue = Math.floor(Math.random() * (20 - 5 + 1)) + 5; // random 5–20%
      const status = endDate > now ? "active" : "expired";

      return {
        product_id: p.id,
        discount_type: "percent",
        discount_value: randomValue,
        start_date: now,
        end_date: endDate,
        status,
      };
    });

    // Insert vào DB
    await queryInterface.bulkInsert("product_discounts", discounts, {});
    console.log(`✅ Đã tạo ${discounts.length} bản ghi giảm giá sản phẩm.`);
  },

  async down(queryInterface, Sequelize) {
    // 🔹 Lấy lại danh sách ID của 150 sản phẩm đầu tiên
    const [products] = await queryInterface.sequelize.query(`
      SELECT id FROM products 
      ORDER BY id 
      LIMIT 150
    `);

    if (!products.length) return;

    const ids = products.map((p) => p.id);

    // 🔹 Xóa discount tương ứng
    await queryInterface.bulkDelete("product_discounts", {
      product_id: { [Op.in]: ids },
    });

    console.log(`🧹 Đã rollback discount cho ${ids.length} sản phẩm.`);
  },
};
