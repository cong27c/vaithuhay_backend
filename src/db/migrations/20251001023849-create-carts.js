"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "customer_vouchers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      final_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      status: {
        type: Sequelize.ENUM("active", "abandoned", "checkedout"),
        defaultValue: "active",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("carts");
  },
};
