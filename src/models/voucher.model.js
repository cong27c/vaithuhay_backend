"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Voucher extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Voucher.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      voucher_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [["percent", "fixed"]],
        },
      },
      voucher_value: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      min_order_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      usage_limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      per_user_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "active",
        validate: {
          isIn: [["active", "inactive", "expired"]],
        },
      },
    },
    {
      sequelize,
      modelName: "Voucher",
      tableName: "vouchers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Voucher;
};
