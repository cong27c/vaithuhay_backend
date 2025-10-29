"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("combo_products", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      combo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "combos",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    // Thêm composite unique constraint để tránh trùng lặp
    await queryInterface.addIndex("combo_products", {
      fields: ["combo_id", "product_id"],
      unique: true,
      name: "combo_products_combo_product_unique",
    });

    // Thêm index
    await queryInterface.addIndex("combo_products", ["combo_id"]);
    await queryInterface.addIndex("combo_products", ["product_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("combo_products");
  },
};
