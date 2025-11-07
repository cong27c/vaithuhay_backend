"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("order_items", "combo_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "product_id", // thêm sau cột product_id (tuỳ schema)
      references: {
        model: "combos", // nếu có bảng combos
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("order_items", "combo_id");
  },
};
