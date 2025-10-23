"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreorderTier extends Model {
    static associate(models) {
      // Một tier thuộc về một chiến dịch preorder
      PreorderTier.belongsTo(models.PreorderCampaign, {
        foreignKey: "campaign_id",
        as: "campaign",
        onDelete: "CASCADE",
      });

      // Một tier có nhiều đơn hàng preorder
      PreorderTier.hasMany(models.PreorderOrder, {
        foreignKey: "tier_id",
        as: "orders",
      });
    }
  }

  PreorderTier.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      campaign_id: DataTypes.INTEGER,
      name: DataTypes.STRING,
      type: {
        type: DataTypes.ENUM(
          "super_early_bird",
          "early_bird",
          "pre_order",
          "retail"
        ),
        allowNull: false,
      },
      price: DataTypes.DECIMAL(12, 2),
      limit_quantity: DataTypes.INTEGER,
      sold_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      discount_percent: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      available_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reserved_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "PreorderTier",
      tableName: "preorder_tiers",
      timestamps: false,
    }
  );
  return PreorderTier;
};
