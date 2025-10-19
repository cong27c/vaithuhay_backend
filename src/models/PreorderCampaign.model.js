"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreorderCampaign extends Model {
    static associate(models) {
      // Một chiến dịch preorder thuộc về một sản phẩm
      PreorderCampaign.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
        onDelete: "CASCADE",
      });

      // Một chiến dịch có nhiều tier
      PreorderCampaign.hasMany(models.PreorderTier, {
        foreignKey: "campaign_id",
        as: "tiers",
      });

      // Một chiến dịch có nhiều đơn hàng preorder (thông qua tiers)
      PreorderCampaign.hasMany(models.PreorderOrder, {
        foreignKey: "campaign_id",
        as: "orders",
      });
    }
  }

  PreorderCampaign.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: DataTypes.INTEGER,
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
      release_date: DataTypes.DATE,
      status: {
        type: DataTypes.ENUM("upcoming", "open", "closed", "released"),
        allowNull: false,
        defaultValue: "upcoming",
      },
      note: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "PreorderCampaign",
      tableName: "preorder_campaigns",
      timestamps: false,
    }
  );
  return PreorderCampaign;
};
