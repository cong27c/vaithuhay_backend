"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_registrations", "slot_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "preorder_slots",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("preorder_registrations", "tier_id", {
      type: Sequelize.INTEGER,
      references: {
        model: "preorder_tiers",
        key: "id",
      },
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_registrations", "slot_id");
    await queryInterface.removeColumn("preorder_registrations", "tier_id");
  },
};
