"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShippingZone extends Model {
    static associate(models) {
      // Một vùng có thể có nhiều ShippingRate
      ShippingZone.hasMany(models.ShippingRate, {
        foreignKey: "zone_id",
        as: "rates",
      });
    }
  }

  ShippingZone.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      province: { type: DataTypes.STRING(100), allowNull: false },
      district: DataTypes.STRING(100),
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ShippingZone",
      tableName: "shipping_zones",
      timestamps: false,
    }
  );

  return ShippingZone;
};
