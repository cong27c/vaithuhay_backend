"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "weight", {
      type: Sequelize.FLOAT, // hoặc DECIMAL(10,2) nếu muốn chính xác tuyệt đối
      allowNull: true,
      defaultValue: 0,
      comment: "Trọng lượng sản phẩm (đơn vị: gram)",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("products", "weight");
  },
};
