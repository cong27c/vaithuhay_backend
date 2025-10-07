"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("blogs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      },
      // author: {
      //   type: Sequelize.STRING,
      //   allowNull: true,
      //   defaultValue: null,
      // },
      // content_html: {
      //   type: Sequelize.TEXT,
      //   allowNull: true,
      // },
      // content_text: {
      //   type: Sequelize.TEXT,
      //   allowNull: true,
      // },
      // type: {
      //   type: Sequelize.ENUM("setup-decor", "product", "cong-nghe"),
      //   allowNull: false,
      //   defaultValue: "product",
      // },
      thumbnail: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("blogs");
  },
};
