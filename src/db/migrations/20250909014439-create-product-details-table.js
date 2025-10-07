"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_details", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      long_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      specifications: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      highlights: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      care_instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      origin: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      material: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("product_details");
  },
};
