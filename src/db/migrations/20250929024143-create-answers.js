"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("answers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "questions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      answered_by: {
        type: Sequelize.ENUM("admin", "user"),
        defaultValue: "admin",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Thêm indexes
    await queryInterface.addIndex("answers", ["question_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("answers");
  },
};
