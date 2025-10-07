"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductImage extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  ProductImage.init(
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
      image_url: {
        type: DataTypes.STRING(500),
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
      modelName: "ProductImage",
      tableName: "product_images",
      timestamps: false,
    }
  );

  return ProductImage;
};
