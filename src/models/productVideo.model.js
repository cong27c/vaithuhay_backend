"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductVideo extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  ProductVideo.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      video_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_main: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "ProductVideo",
      tableName: "product_videos",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ProductVideo;
};
