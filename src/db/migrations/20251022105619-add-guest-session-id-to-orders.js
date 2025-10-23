"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "guest_session_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "guest_sessions", // Tên bảng được tham chiếu
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("orders", "guest_session_id");
  },
};
