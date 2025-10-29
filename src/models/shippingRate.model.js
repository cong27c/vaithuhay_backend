"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShippingRate extends Model {
    static associate(models) {
      ShippingRate.belongsTo(models.ShippingZone, {
        foreignKey: "zone_id",
        as: "zone",
        onDelete: "CASCADE",
      });

      ShippingRate.belongsTo(models.ShippingMethod, {
        foreignKey: "method_id",
        as: "method",
        onDelete: "CASCADE",
      });
    }
  }

  ShippingRate.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      zone_id: { type: DataTypes.INTEGER, allowNull: false },
      method_id: { type: DataTypes.INTEGER, allowNull: false },
      min_weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      max_weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ShippingRate",
      tableName: "shipping_rates",
      timestamps: false,
    }
  );

  return ShippingRate;
};
