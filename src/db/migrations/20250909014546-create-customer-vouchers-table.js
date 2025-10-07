"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customer_vouchers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "vouchers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "assigned",
      },
      expires_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("customer_vouchers");
  },
};
