"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GuestSession extends Model {
    static associate(models) {
      GuestSession.belongsTo(models.Customer, {
        foreignKey: "customer_id",
        as: "customer",
        onDelete: "CASCADE",
      });
    }
  }

  GuestSession.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      session_id: { type: DataTypes.STRING, allowNull: false },
      ip_address: DataTypes.STRING,
      customer_id: DataTypes.INTEGER,
      expires_at: DataTypes.DATE,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "GuestSession",
      tableName: "guest_sessions",
      timestamps: false,
    }
  );

  return GuestSession;
};
