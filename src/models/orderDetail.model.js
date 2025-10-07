"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OrderDetail extends Model {
    static associate(models) {
      OrderDetail.belongsTo(models.Order, { foreignKey: "order_id" });
      OrderDetail.belongsTo(models.Product, { foreignKey: "product_id" });
      OrderDetail.belongsTo(models.ProductVariant, {
        foreignKey: "variant_id",
      });
    }
  }

  OrderDetail.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      order_id: {
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
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
        },
      },
      unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "OrderDetail",
      tableName: "order_details",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return OrderDetail;
};
