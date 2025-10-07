"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("attribute_values", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      attribute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "attributes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      value: {
        type: Sequelize.STRING(100),
        allowNull: false,
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
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Thêm index để tối ưu performance
    await queryInterface.addIndex("attribute_values", ["attribute_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("attribute_values");
  },
};
