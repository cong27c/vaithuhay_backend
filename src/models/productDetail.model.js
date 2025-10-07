"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductDetail extends Model {
    static associate(models) {
      ProductDetail.belongsTo(models.Product, { foreignKey: "product_id" });
    }
  }

  ProductDetail.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      long_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      specifications: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      highlights: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      care_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      origin: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      material: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ProductDetail",
      tableName: "product_details",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ProductDetail;
};
