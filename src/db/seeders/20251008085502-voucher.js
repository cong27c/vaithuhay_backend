"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("vouchers", [
      // === 1️⃣ Theo sản phẩm cụ thể ===
      {
        code: "DTG15",
        description: "Giảm 15% cho các sản phẩm Đồng hồ Divoom Times Gate",
        voucher_type: "percent",
        voucher_value: 15.0,
        min_order_amount: 0,
        usage_limit: 100,
        per_user_limit: 1,
        start_date: "2025-10-01",
        end_date: "2025-10-31",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // === 2️⃣ Theo collection (bộ sưu tập / danh mục) ===
      {
        code: "SMARTWATCH200K",
        description:
          "Giảm 200.000đ cho các sản phẩm thuộc bộ sưu tập đồng hồ thông minh smartwatch",
        voucher_type: "fixed",
        voucher_value: 200000.0,
        min_order_amount: 2500000.0,
        usage_limit: 100,
        per_user_limit: 1,
        start_date: "2025-10-01",
        end_date: "2025-11-30",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // === 3️⃣ Theo giá trị đơn hàng tối thiểu ===
      {
        code: "ORDER300K",
        description: "Giảm 10% cho đơn hàng từ 300.000đ trở lên",
        voucher_type: "percent",
        voucher_value: 10.0,
        min_order_amount: 300000.0,
        usage_limit: null, // không giới hạn
        per_user_limit: 2,
        start_date: "2025-09-01",
        end_date: "2025-12-31",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // === 4️⃣ Dành cho đơn hàng đầu tiên (first order) ===
      {
        code: "FIRSTORDER100K",
        description: "Giảm 100.000đ cho đơn hàng đầu tiên của bạn",
        voucher_type: "fixed",
        voucher_value: 100000.0,
        min_order_amount: 0,
        usage_limit: null,
        per_user_limit: 1,
        start_date: "2025-01-01",
        end_date: "2026-01-01",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },

      // === 5️⃣ Theo khung thời gian (time frame) ===
      {
        code: "FLASHSALE20",
        description:
          "Giảm 20% cho đơn hàng trong khung giờ 20:00 - 22:00 hằng ngày",
        voucher_type: "percent",
        voucher_value: 20.0,
        min_order_amount: 0,
        usage_limit: 100,
        per_user_limit: 1,
        start_date: "2025-10-08",
        end_date: "2025-10-15",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        code: "DEAL1TRIEU",
        description:
          "Giảm 1,000,000₫ giá trị đơn hàng | Mua tối thiểu 12,000,000₫",

        voucher_type: "fixed",
        voucher_value: 1000000,
        min_order_amount: 12000000.0,
        usage_limit: 1000,
        per_user_limit: 1,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        code: "DISCOUNT400",
        description:
          "Giảm 400,000₫ giá trị đơn hàng | Mua tối thiểu 6,500,000₫",

        voucher_type: "fixed",
        voucher_value: 400000.0,
        min_order_amount: 6500000.0,
        usage_limit: 500,
        per_user_limit: 3,
        start_date: "2024-01-01",
        end_date: "2024-06-30",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("vouchers", null, {});
  },
};
