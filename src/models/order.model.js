"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.Review, {
        foreignKey: "order_id",
        as: "reviews",
      });
      Order.hasMany(models.OrderDetail, { foreignKey: "order_id" });
      Order.belongsToMany(models.Product, {
        through: models.OrderDetail,
        foreignKey: "order_id",
        otherKey: "product_id",
        as: "products",
      });
    }
  }

  Order.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      order_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      order_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      final_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [["pending", "paid", "shipped", "cancelled"]],
        },
      },
    },
    {
      sequelize,
      modelName: "Order",
      tableName: "orders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Order;
};
