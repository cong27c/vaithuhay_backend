"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Lấy tất cả combo hiện có
    const [combos] = await queryInterface.sequelize.query(`
      SELECT id FROM combos
    `);

    if (!combos.length) {
      console.log("⚠️ Không có combo nào trong bảng 'combos'.");
      return;
    }

    // Tạo mảng update promise
    const updates = combos?.map((combo) => {
      const randomDiscount = Math.floor(Math.random() * (25 - 10 + 1)) + 10; // 10 → 25%
      return queryInterface.sequelize.query(`
        UPDATE combos 
        SET discount_value = ${randomDiscount}, updated_at = NOW() 
        WHERE id = ${combo.id}
      `);
    });

    await Promise.all(updates);
    console.log(
      `✅ Đã cập nhật discount_value ngẫu nhiên (10-25%) cho ${combos.length} combo.`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE combos SET discount_value = NULL;
    `);
    console.log("↩️ Đã reset discount_value về NULL.");
  },
};
