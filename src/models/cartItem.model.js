"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    static associate(models) {
      CartItem.belongsTo(models.Cart, { foreignKey: "cart_id", as: "Cart" });
      CartItem.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "Product",
      });
      CartItem.belongsTo(models.ProductVariant, {
        foreignKey: "variant_id",
        as: "ProductVariant",
      });
      CartItem.belongsTo(models.Combo, { foreignKey: "combo_id", as: "Combo" });
    }
  }

  CartItem.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cart_id: DataTypes.INTEGER,
      product_id: { type: DataTypes.INTEGER, allowNull: true },
      variant_id: { type: DataTypes.INTEGER, allowNull: true },
      preorder_slot_id: { type: DataTypes.INTEGER, allowNull: true },
      tier_id: { type: DataTypes.INTEGER, allowNull: true },
      combo_id: { type: DataTypes.INTEGER, allowNull: true },
      quantity: DataTypes.INTEGER,
      unit_price: DataTypes.DECIMAL(10, 2),
      discount_amount: DataTypes.DECIMAL(10, 2),
      total_price: DataTypes.DECIMAL(10, 2),
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CartItem",
      tableName: "cart_items",
      timestamps: false,
    }
  );

  return CartItem;
};
