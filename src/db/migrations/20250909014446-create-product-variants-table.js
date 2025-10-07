"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_variants", {
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
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      variant_type: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      variant_value: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(500),
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
    await queryInterface.dropTable("product_variants");
  },
};
