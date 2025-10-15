"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.Review, {
        foreignKey: "order_id",
        as: "reviews",
      });
      Order.hasMany(models.OrderItem, { foreignKey: "order_id" });
      Order.belongsToMany(models.Product, {
        through: models.OrderItem,
        foreignKey: "order_id",
        otherKey: "product_id",
        as: "products",
      });

      Order.hasOne(models.Payment, {
        foreignKey: "order_id",
        as: "payment",
      });

      Order.hasOne(models.Shipment, {
        foreignKey: "order_id",
        as: "shipment",
      });

      Order.belongsTo(models.Address, {
        foreignKey: "address_id",
        as: "address",
      });
    }
  }

  Order.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: DataTypes.INTEGER,
      address_id: DataTypes.INTEGER,
      order_number: DataTypes.STRING(100),
      order_date: DataTypes.DATE,
      total_amount: DataTypes.DECIMAL(12, 2),
      discount_amount: DataTypes.DECIMAL(12, 2),
      voucher_id: DataTypes.INTEGER,
      final_amount: DataTypes.DECIMAL(12, 2),
      status: DataTypes.STRING(50),
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Order",
      tableName: "orders",
      timestamps: false,
    }
  );

  return Order;
};
