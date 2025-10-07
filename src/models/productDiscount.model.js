"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductDiscount extends Model {
    static associate(models) {}
  }

  ProductDiscount.init(
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
      discount_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [["percent", "fixed"]],
        },
      },
      discount_value: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [["active", "expired"]],
        },
      },
    },
    {
      sequelize,
      modelName: "ProductDiscount",
      tableName: "product_discounts",
      timestamps: false,
    }
  );

  return ProductDiscount;
};
