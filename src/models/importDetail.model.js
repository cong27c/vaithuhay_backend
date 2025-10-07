"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ImportDetail extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  ImportDetail.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      import_id: {
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
      batch_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      quantity_ordered: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      quantity_received: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      unit_cost: {
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
      modelName: "ImportDetail",
      tableName: "import_details",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ImportDetail;
};
