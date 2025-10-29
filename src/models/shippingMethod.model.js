"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShippingMethod extends Model {
    static associate(models) {
      // Một phương thức ship có thể có nhiều ShippingRate
      ShippingMethod.hasMany(models.ShippingRate, {
        foreignKey: "method_id",
        as: "rates",
      });
    }
  }

  ShippingMethod.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ShippingMethod",
      tableName: "shipping_methods",
      timestamps: false,
    }
  );

  return ShippingMethod;
};
