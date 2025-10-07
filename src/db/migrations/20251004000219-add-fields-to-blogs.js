"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Thêm cột author
    await queryInterface.addColumn("blogs", "author", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    // Thêm cột content_html
    await queryInterface.addColumn("blogs", "content_html", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Thêm cột content_text
    await queryInterface.addColumn("blogs", "content_text", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Thêm cột type với ENUM
    await queryInterface.addColumn("blogs", "type", {
      type: Sequelize.ENUM("setup-decor", "product", "cong-nghe"),
      allowNull: false,
      defaultValue: "product",
    });
  },

  async down(queryInterface, Sequelize) {
    // Xóa các cột đã thêm khi rollback
    await queryInterface.removeColumn("blogs", "author");
    await queryInterface.removeColumn("blogs", "content_html");
    await queryInterface.removeColumn("blogs", "content_text");
    await queryInterface.removeColumn("blogs", "type");

    // Xóa ENUM type
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_blogs_type;"
    );
  },
};
