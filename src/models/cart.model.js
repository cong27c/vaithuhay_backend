"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    static associate(models) {
      Cart.belongsTo(models.Customer, { foreignKey: "customer_id" });
      Cart.hasMany(models.CartItem, { foreignKey: "cart_id", as: "items" });
    }
  }

  Cart.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: DataTypes.INTEGER,
      session_id: DataTypes.STRING,
      total_amount: DataTypes.DECIMAL(10, 2),
      discount_amount: DataTypes.DECIMAL(10, 2),
      voucher_id: DataTypes.INTEGER,
      final_amount: DataTypes.DECIMAL(10, 2),
      status: DataTypes.ENUM("active", "abandoned", "checkedout"),
      expires_at: DataTypes.DATE,
      user_agent: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Cart",
      tableName: "carts",
      timestamps: false,
    }
  );

  return Cart;
};
