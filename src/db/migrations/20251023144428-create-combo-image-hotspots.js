"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("combo_image_hotspots", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      combo_image_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "combo_images",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products", // Giả sử bạn đã có bảng products
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      top_position: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: "Vị trí top (ví dụ: 37%)",
      },
      left_position: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: "Vị trí left (ví dụ: 60%)",
      },
      link_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      tooltip_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    // Thêm index
    await queryInterface.addIndex("combo_image_hotspots", ["combo_image_id"]);
    await queryInterface.addIndex("combo_image_hotspots", ["product_id"]);
    await queryInterface.addIndex("combo_image_hotspots", ["display_order"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("combo_image_hotspots");
  },
};
