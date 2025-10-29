"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("shipping_zones", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      province: { type: Sequelize.STRING(100), allowNull: false },
      district: { type: Sequelize.STRING(100), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("shipping_zones");
  },
};
