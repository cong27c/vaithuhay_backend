"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("shipments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      carrier: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Tên đơn vị vận chuyển (GHN, GHTK, ViettelPost...)",
      },
      tracking_code: { type: Sequelize.STRING(100), allowNull: true },
      status: {
        type: Sequelize.ENUM(
          "waiting",
          "shipping",
          "delivered",
          "failed",
          "cancelled"
        ),
        defaultValue: "waiting",
      },
      shipping_fee: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      shipped_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      failed_reason: { type: Sequelize.STRING(255), allowNull: true },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    await queryInterface.addIndex("shipments", ["order_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("shipments");
  },
};
