"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("guest_sessions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      session_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "customers", // tên bảng tham chiếu
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      cart_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "carts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
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

    await queryInterface.addIndex("guest_sessions", ["session_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("guest_sessions");
  },
};
