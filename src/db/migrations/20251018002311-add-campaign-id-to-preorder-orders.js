"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Thêm cột campaign_id
    await queryInterface.addColumn("preorder_orders", "campaign_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "preorder_campaigns",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    // Thêm index để tối ưu truy vấn
    await queryInterface.addIndex("preorder_orders", ["campaign_id"]);
  },

  async down(queryInterface, Sequelize) {
    // Xóa index
    await queryInterface.removeIndex("preorder_orders", ["campaign_id"]);

    // Xóa cột campaign_id
    await queryInterface.removeColumn("preorder_orders", "campaign_id");
  },
};
