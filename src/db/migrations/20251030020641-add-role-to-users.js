"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.ENUM("admin", "staff", "customer"),
      allowNull: false,
      defaultValue: "customer",
      comment: "Vai trò của người dùng: admin / staff / customer",
    });
  },

  async down(queryInterface, Sequelize) {
    // Cần xóa ENUM type thủ công với PostgreSQL
    await queryInterface.removeColumn("users", "role");

    // Nếu bạn dùng PostgreSQL, thêm dòng này để xóa enum type:
    if (queryInterface.sequelize.getDialect() === "postgres") {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_users_role";'
      );
    }
  },
};
