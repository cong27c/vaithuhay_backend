"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.Cart, { foreignKey: "cart_id" });
      CartItem.belongsTo(models.Product, { foreignKey: "product_id" });
      CartItem.belongsTo(models.ProductVariant, { foreignKey: "variant_id" });
    }
  }

  CartItem.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      cart_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
    },
    {
      sequelize,
      modelName: "CartItem",
      tableName: "cart_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CartItem;
};
