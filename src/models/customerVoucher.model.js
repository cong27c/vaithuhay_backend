"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CustomerVoucher extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  CustomerVoucher.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "assigned",
        validate: {
          isIn: [["assigned", "used", "expired"]],
        },
      },
      expires_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CustomerVoucher",
      tableName: "customer_vouchers",
      timestamps: false,
    }
  );

  return CustomerVoucher;
};
