"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    static associate(models) {
      // Quan hệ 1 câu hỏi thuộc về 1 sản phẩm
      Question.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });

      // Quan hệ 1 câu hỏi thuộc về 1 user
      Question.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // Quan hệ 1 câu hỏi có nhiều câu trả lời
      Question.hasMany(models.Answer, {
        foreignKey: "question_id",
        as: "answers",
      });
    }
  }

  Question.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "answered"),
        defaultValue: "pending",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Question",
      tableName: "questions",
      timestamps: false,
    }
  );

  return Question;
};
