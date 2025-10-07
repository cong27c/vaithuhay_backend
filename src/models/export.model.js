"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Export extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Export.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      export_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      from_store_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      to_store_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      export_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      shipped_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      carrier: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      tracking_number: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      total_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      total_value: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      shipping_cost: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: [["pending", "shipped", "delivered", "returned", "cancelled"]],
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      shipped_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reference: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Export",
      tableName: "exports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Export;
};
