"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("variant_attributes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "product_variants", // Giả sử bạn đã có bảng này
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attribute_value_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "attribute_values",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    // Thêm composite unique constraint để tránh trùng lặp
    await queryInterface.addIndex(
      "variant_attributes",
      ["variant_id", "attribute_value_id"],
      { unique: true }
    );

    // Thêm index để tối ưu performance
    await queryInterface.addIndex("variant_attributes", ["variant_id"]);
    await queryInterface.addIndex("variant_attributes", ["attribute_value_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("variant_attributes");
  },
};
