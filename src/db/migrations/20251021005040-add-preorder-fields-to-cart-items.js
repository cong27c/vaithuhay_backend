"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_registrations", "variant_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // tùy nhu cầu, có thể allowNull: false
      references: {
        model: "product_variants", // nếu có bảng variants
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_registrations", "variant_id");
  },
};
