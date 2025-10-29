"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cart_items", "preorder_slot_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("cart_items", "tier_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cart_items", "preorder_slot_id");
    await queryInterface.removeColumn("cart_items", "tier_id");
  },
};
