"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      OrderItem.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
      });
      OrderItem.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });
      OrderItem.belongsTo(models.ProductVariant, {
        foreignKey: "variant_id",
        as: "variant",
      });
    }
  }

  OrderItem.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: DataTypes.INTEGER,
      product_id: DataTypes.INTEGER,
      variant_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
      unit_price: DataTypes.DECIMAL(12, 2),
      discount_amount: DataTypes.DECIMAL(12, 2),
      total_price: DataTypes.DECIMAL(12, 2),
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "OrderItem",
      tableName: "order_items",
      timestamps: false,
    }
  );

  return OrderItem;
};
