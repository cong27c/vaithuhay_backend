"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cart_items", "combo_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "combos",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cart_items", "combo_id");
  },
};
