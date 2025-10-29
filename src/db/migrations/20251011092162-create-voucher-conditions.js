"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("voucher_conditions", {
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
      condition_type: {
        type: Sequelize.ENUM(
          "min_order_value",
          "collection",
          "product",
          "user_group",
          "first_order",
          "specific_user",
          "time_frame"
        ),
        allowNull: false,
      },
      operator: {
        type: Sequelize.ENUM("=", ">", "<", ">=", "<=", "in", "not_in"),
        allowNull: false,
      },
      condition_value: {
        type: Sequelize.TEXT, // Lưu JSON hoặc string
        allowNull: false,
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
    await queryInterface.addIndex("voucher_conditions", ["voucher_id"]);
    await queryInterface.addIndex("voucher_conditions", ["condition_type"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("voucher_conditions");
  },
};
