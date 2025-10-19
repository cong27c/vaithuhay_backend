"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_registrations", "campaign_id", {
      type: Sequelize.INTEGER, // hoặc Sequelize.BIGINT nếu id của preorder_campaigns là BIGINT
      allowNull: false,
      references: {
        model: "preorder_campaigns", // tên bảng tham chiếu
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_registrations", "campaign_id");
  },
};
