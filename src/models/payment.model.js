"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Một payment thuộc về một đơn hàng
      Payment.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "CASCADE",
      });
    }
  }

  Payment.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: DataTypes.INTEGER,
      method: DataTypes.ENUM("cod", "bank", "momo", "vnpay"),
      transaction_id: DataTypes.STRING(100),
      amount: DataTypes.DECIMAL(10, 2),
      status: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      paid_at: DataTypes.DATE,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      timestamps: false,
    }
  );

  return Payment;
};
