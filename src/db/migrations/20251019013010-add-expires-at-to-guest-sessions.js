"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("guest_sessions", "expires_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      after: "ip_address", // (MySQL) đặt sau ip_address, có thể bỏ nếu DB khác
      comment:
        "Thời điểm hết hạn của phiên guest (ví dụ 30 ngày kể từ khi tạo)",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("guest_sessions", "expires_at");
  },
};
