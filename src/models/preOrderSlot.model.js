"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreorderSlot extends Model {
    static associate(models) {
      // 🔹 Mỗi slot thuộc về một đăng ký preorder
      PreorderSlot.belongsTo(models.PreorderRegistration, {
        foreignKey: "registration_id",
        as: "registration",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // 🔹 Mỗi slot thuộc về một campaign
      PreorderSlot.belongsTo(models.PreorderCampaign, {
        foreignKey: "campaign_id",
        as: "campaign",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // 🔹 Mỗi slot thuộc về một tier
      PreorderSlot.belongsTo(models.PreorderTier, {
        foreignKey: "tier_id",
        as: "tier",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  PreorderSlot.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      registration_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      campaign_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("reserved", "confirmed", "expired", "cancelled"),
        defaultValue: "reserved",
      },
      reserved_at: DataTypes.DATE,
      expired_at: DataTypes.DATE,
      confirmed_at: DataTypes.DATE,
      released_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "PreorderSlot",
      tableName: "preorder_slots",
      timestamps: false,
    }
  );

  return PreorderSlot;
};
