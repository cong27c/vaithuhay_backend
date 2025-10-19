"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("preorder_registrations", "mail_sent", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Trạng thái đã gửi mail hay chưa",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("preorder_registrations", "mail_sent");
  },
};
