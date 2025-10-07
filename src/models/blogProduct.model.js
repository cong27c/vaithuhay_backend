"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BlogProduct extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  BlogProduct.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      blog_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "BlogProduct",
      tableName: "blog_products",
      timestamps: false,
    }
  );

  return BlogProduct;
};
