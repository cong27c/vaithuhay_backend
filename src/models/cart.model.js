"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    static associate(models) {
      Cart.belongsTo(models.Customer, { foreignKey: "customer_id" });
      Cart.hasMany(models.CartItem, { foreignKey: "cart_id" });
    }
  }

  Cart.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      final_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.ENUM("active", "abandoned", "checkedout"),
        defaultValue: "active",
      },
    },
    {
      sequelize,
      modelName: "Cart",
      tableName: "carts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Cart;
};
