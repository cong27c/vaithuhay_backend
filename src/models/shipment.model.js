"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Shipment extends Model {
    static associate(models) {
      // Một shipment thuộc về một đơn hàng
      Shipment.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "CASCADE",
      });
    }
  }

  Shipment.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: DataTypes.INTEGER,
      carrier: DataTypes.STRING(100),
      tracking_code: DataTypes.STRING(100),
      status: DataTypes.ENUM("waiting", "shipping", "delivered", "failed"),
      shipping_fee: DataTypes.DECIMAL(10, 2),
      shipped_at: DataTypes.DATE,
      delivered_at: DataTypes.DATE,
      failed_reason: DataTypes.STRING(255),
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Shipment",
      tableName: "shipments",
      timestamps: false,
    }
  );

  return Shipment;
};
