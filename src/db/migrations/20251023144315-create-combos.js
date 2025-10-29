"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("combos", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      author: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      style: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      discount_value: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("combos");
  },
};
