"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1️⃣ Gỡ constraint cũ
    await queryInterface.removeConstraint("cart_items", "cart_items_ibfk_2");

    // 2️⃣ Cập nhật lại cột product_id cho phép NULL
    await queryInterface.changeColumn("cart_items", "product_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    // Quay lại trạng thái cũ (NOT NULL)
    await queryInterface.changeColumn("cart_items", "product_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },
};
