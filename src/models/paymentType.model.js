"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentType extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  PaymentType.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PaymentType",
      tableName: "payment_types",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PaymentType;
};
