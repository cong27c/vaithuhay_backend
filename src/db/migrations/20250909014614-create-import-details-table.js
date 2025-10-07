"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("import_details", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      import_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "imports",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      batch_no: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      quantity_ordered: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      quantity_received: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unit_cost: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      discount_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      line_total: {
        type: Sequelize.DECIMAL(14, 2),
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
    await queryInterface.dropTable("import_details");
  },
};
