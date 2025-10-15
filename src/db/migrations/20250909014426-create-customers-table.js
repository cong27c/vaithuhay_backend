"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      first_name: { type: Sequelize.STRING(50), allowNull: true },
      last_name: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true }, // allow null because guests may not provide
      phone: { type: Sequelize.STRING(20), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      is_guest: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      guest_token: { type: Sequelize.STRING, allowNull: true, unique: true },
      converted_at: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.addIndex("customers", ["is_guest"]);
    await queryInterface.addIndex("customers", ["guest_token"]);
    await queryInterface.addIndex("customers", ["email"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("customers");
  },
};
