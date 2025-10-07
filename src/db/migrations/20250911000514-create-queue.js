"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("queues", {
      id: {
        type: Sequelize.INTEGER({ unsigned: true }),
        autoIncrement: true,
        primaryKey: true,
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: "pending",
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
      },
      max_retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      retries_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("queues");
  },
};
