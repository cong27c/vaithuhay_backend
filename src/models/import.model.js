"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Import extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Import.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      import_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      purchase_order_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      import_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expected_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      received_date: {
        type: DataTypes.DATEONLY,
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
      total_cost: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "VND",
      },
      shipping_cost: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      tax_amount: {
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
          isIn: [["pending", "partially_received", "completed", "cancelled"]],
        },
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      received_by: {
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
      modelName: "Import",
      tableName: "imports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Import;
};
