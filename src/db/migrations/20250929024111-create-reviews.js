"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reviews", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products", // Giả sử bạn đã có bảng products
          key: "id",
        },
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users", // Giả sử bạn đã có bảng users
          key: "id",
        },
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      rating: {
        type: Sequelize.TINYINT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      helpful_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Thêm indexes
    await queryInterface.addIndex("reviews", ["product_id", "rating"]);
    await queryInterface.addIndex("reviews", ["user_id"]);
    await queryInterface.addIndex("reviews", ["status", "created_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("reviews");
  },
};
