"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_campaigns", "release_date", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Thời gian phát hành sản phẩm",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_campaigns", "release_date");
  },
};
