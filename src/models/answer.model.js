"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Answer extends Model {
    static associate(models) {
      // Quan hệ 1 câu trả lời thuộc về 1 câu hỏi
      Answer.belongsTo(models.Question, {
        foreignKey: "question_id",
        as: "question",
        onDelete: "CASCADE",
      });

      // Nếu muốn lưu thông tin người trả lời là user (không phải admin)
      Answer.belongsTo(models.User, {
        foreignKey: "answered_by_user_id", // cần thêm trường này nếu trả lời bởi user
        as: "user",
      });
    }
  }

  Answer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      answered_by: {
        type: DataTypes.ENUM("admin", "user"),
        defaultValue: "admin",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Answer",
      tableName: "answers",
      timestamps: false,
    }
  );

  return Answer;
};
