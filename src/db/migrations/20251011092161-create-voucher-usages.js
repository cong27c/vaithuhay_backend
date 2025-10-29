"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("voucher_usages", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "vouchers",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
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

    // Thêm indexes cho hiệu suất
    await queryInterface.addIndex("voucher_usages", ["voucher_id"]);
    await queryInterface.addIndex("voucher_usages", ["user_id"]);
    await queryInterface.addIndex("voucher_usages", ["order_id"]);
    await queryInterface.addIndex("voucher_usages", ["used_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("voucher_usages");
  },
};
