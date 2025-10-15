"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // === Lấy id voucher tương ứng ===
    const [vouchers] = await queryInterface.sequelize.query(
      `SELECT id, code FROM vouchers`
    );

    const getVoucherId = (code) => vouchers.find((v) => v.code === code)?.id;

    await queryInterface.bulkInsert("voucher_conditions", [
      // 1️⃣ DTG15 – áp dụng cho sản phẩm cụ thể
      {
        voucher_id: getVoucherId("DTG15"),
        condition_type: "product",
        operator: "in",
        condition_value: JSON.stringify([101, 102, 103]), // ID sản phẩm ví dụ
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 2️⃣ SMARTWATCH200K – áp dụng cho collection (bộ sưu tập)
      {
        voucher_id: getVoucherId("SMARTWATCH200K"),
        condition_type: "collection",
        operator: "in",
        condition_value: JSON.stringify([11]), // ID các collection ví dụ
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 3️⃣ ORDER300K – đơn hàng tối thiểu
      {
        voucher_id: getVoucherId("ORDER300K"),
        condition_type: "min_order_value",
        operator: ">=",
        condition_value: "300000",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 4️⃣ FIRSTORDER100K – đơn đầu tiên
      {
        voucher_id: getVoucherId("FIRSTORDER100K"),
        condition_type: "first_order",
        operator: "=",
        condition_value: "true",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 5️⃣ FLASHSALE20 – khung giờ
      {
        voucher_id: getVoucherId("FLASHSALE20"),
        condition_type: "time_frame",
        operator: "=",
        condition_value: JSON.stringify({ start: "20:00", end: "22:00" }),
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 6️⃣ DEAL1TRIEU – đơn từ 12 triệu
      {
        voucher_id: getVoucherId("DEAL1TRIEU"),
        condition_type: "min_order_value",
        operator: ">=",
        condition_value: "12000000",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // 7️⃣ DISCOUNT400 – đơn từ 6.5 triệu
      {
        voucher_id: getVoucherId("DISCOUNT400"),
        condition_type: "min_order_value",
        operator: ">=",
        condition_value: "6500000",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("voucher_conditions", null, {});
  },
};
