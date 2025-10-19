"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_tiers", "available_quantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("preorder_tiers", "reserved_quantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_tiers", "available_quantity");
    await queryInterface.removeColumn("preorder_tiers", "reserved_quantity");
  },
};
