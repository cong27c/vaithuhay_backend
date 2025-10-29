"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("shipping_rates", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      zone_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "shipping_zones", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      method_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "shipping_methods", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      min_weight: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      max_weight: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("shipping_rates");
  },
};
