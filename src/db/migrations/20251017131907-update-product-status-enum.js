"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("products", "status", {
      type: Sequelize.ENUM("coming_soon", "pre_order", "available"),
      allowNull: false,
      defaultValue: "coming_soon",
      comment: "Trạng thái phát hành: sắp ra mắt, mở preorder, đã có sẵn",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("products", "status", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },
};
