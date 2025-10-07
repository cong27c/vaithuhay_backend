"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("review_media", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      review_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "reviews",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      media_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      media_type: {
        type: Sequelize.ENUM("image", "video"),
        defaultValue: "image",
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Thêm indexes
    await queryInterface.addIndex("review_media", ["review_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("review_media");
  },
};
