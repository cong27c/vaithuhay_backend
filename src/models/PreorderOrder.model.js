"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreorderOrder extends Model {
    static associate(models) {
      // Một đơn hàng preorder thuộc về một tier
      PreorderOrder.belongsTo(models.PreorderTier, {
        foreignKey: "tier_id",
        as: "tier",
        onDelete: "CASCADE",
      });

      // Một đơn hàng preorder thuộc về một campaign
      PreorderOrder.belongsTo(models.PreorderCampaign, {
        foreignKey: "campaign_id",
        as: "campaign",
        onDelete: "CASCADE",
      });

      // Một đơn hàng preorder có thể thuộc về một user (nếu đã đăng nhập)
      PreorderOrder.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
        onDelete: "SET NULL",
      });
    }
  }

  PreorderOrder.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tier_id: DataTypes.INTEGER,
      campaign_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER,
      guest_email: DataTypes.STRING,
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      amount: DataTypes.DECIMAL(12, 2),
      deposit_amount: DataTypes.DECIMAL(12, 2),
      status: {
        type: DataTypes.ENUM("pending", "paid", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "PreorderOrder",
      tableName: "preorder_orders",
      timestamps: false,
    }
  );
  return PreorderOrder;
};
