"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrderAddress extends Model {
    static associate(models) {
      OrderAddress.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
      });
    }
  }

  OrderAddress.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: DataTypes.INTEGER,
      full_name: DataTypes.STRING(100),
      phone: DataTypes.STRING(20),
      email: DataTypes.STRING(100),
      province: DataTypes.STRING(100),
      district: DataTypes.STRING(100),
      ward: DataTypes.STRING(100),
      street_address: DataTypes.STRING(255),
      created_at: DataTypes.DATE,
      // updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "OrderAddress",
      tableName: "order_addresses",
      timestamps: false,
    }
  );

  return OrderAddress;
};
