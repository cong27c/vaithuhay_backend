"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReviewMedia extends Model {
    static associate(models) {
      // Quan hệ 1 media thuộc về 1 review
      ReviewMedia.belongsTo(models.Review, {
        foreignKey: "review_id",
        as: "review",
        onDelete: "CASCADE",
      });
    }
  }

  ReviewMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      media_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      media_type: {
        type: DataTypes.ENUM("image", "video"),
        defaultValue: "image",
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "ReviewMedia",
      tableName: "review_media",
      timestamps: false,
    }
  );

  return ReviewMedia;
};
