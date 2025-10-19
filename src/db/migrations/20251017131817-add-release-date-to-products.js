"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "release_date", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "price", // nếu MySQL, có thể chỉ định vị trí
      comment: "Ngày phát hành sản phẩm (mở bán chính thức)",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("products", "release_date");
  },
};
