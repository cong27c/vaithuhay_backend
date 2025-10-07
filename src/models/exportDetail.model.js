"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ExportDetail extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  ExportDetail.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      export_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
        },
      },
      unit_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      discount_amount: {
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
      line_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "ExportDetail",
      tableName: "export_details",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ExportDetail;
};
