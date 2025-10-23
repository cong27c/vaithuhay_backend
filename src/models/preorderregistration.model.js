"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PreorderRegistration extends Model {
    static associate(models) {
      // 🔹 Nếu là khách đã đăng nhập
      PreorderRegistration.belongsTo(models.Customer, {
        foreignKey: "customer_id",
        as: "customer",
        onDelete: "SET NULL",
      });

      // 🔹 Nếu là khách vãng lai
      PreorderRegistration.belongsTo(models.GuestSession, {
        foreignKey: "guest_session_id",
        as: "guest_session",
        onDelete: "SET NULL",
      });

      PreorderRegistration.belongsTo(models.PreorderTier, {
        foreignKey: "tier_id",
        as: "tier",
      });
      PreorderRegistration.belongsTo(models.PreorderCampaign, {
        foreignKey: "campaign_id",
        as: "campaign",
      });

      // 🔹 Liên kết với sản phẩm
      PreorderRegistration.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
        onDelete: "CASCADE",
      });
    }
  }

  PreorderRegistration.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      guest_session_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      campaign_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      slot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      mail_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "PreorderRegistration",
      tableName: "preorder_registrations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PreorderRegistration;
};
