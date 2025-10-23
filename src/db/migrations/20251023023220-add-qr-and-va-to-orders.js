"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "qr_code_url", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "URL QR code cho payment",
    });

    await queryInterface.addColumn("orders", "virtual_account", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Số tài khoản ảo cho payment",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("orders", "qr_code_url");
    await queryInterface.removeColumn("orders", "virtual_account");
  },
};
