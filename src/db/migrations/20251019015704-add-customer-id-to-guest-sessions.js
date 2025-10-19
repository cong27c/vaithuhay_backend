"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("guest_sessions", "customer_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "customers", // tên bảng tham chiếu
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // nếu customer bị xóa thì set null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("guest_sessions", "customer_id");
  },
};
