"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherUsage extends Model {
    static associate(models) {
      // Quan hệ: 1 voucher usage thuộc về 1 voucher
      VoucherUsage.belongsTo(models.Voucher, {
        foreignKey: "voucher_id",
        as: "voucher",
        onDelete: "CASCADE",
      });

      // Quan hệ: 1 voucher usage thuộc về 1 user
      VoucherUsage.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
        onDelete: "CASCADE",
      });

      // Quan hệ: 1 voucher usage thuộc về 1 order
      VoucherUsage.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
        onDelete: "CASCADE",
      });
    }
  }

  VoucherUsage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "vouchers",
          key: "id",
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "VoucherUsage",
      tableName: "voucher_usages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return VoucherUsage;
};
