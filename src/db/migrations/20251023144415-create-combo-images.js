"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("combo_images", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      combo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "combos",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      image_type: {
        type: Sequelize.ENUM("thumbnail", "slide", "gallery"),
        defaultValue: "gallery",
      },
      main_image: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Xác định ảnh chính của combo",
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      alt_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Thêm index để tối ưu performance
    await queryInterface.addIndex("combo_images", ["combo_id"]);
    await queryInterface.addIndex("combo_images", ["main_image"]);
    await queryInterface.addIndex("combo_images", ["display_order"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("combo_images");
  },
};
