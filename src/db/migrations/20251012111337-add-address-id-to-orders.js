// File: migrations/XXXXXX-add-address-id-to-orders.js
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "address_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "addresses",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Thêm index để tối ưu performance
    await queryInterface.addIndex("orders", ["address_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("orders", "address_id");
  },
};
