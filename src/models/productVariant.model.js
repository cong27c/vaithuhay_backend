"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductVariant extends Model {
    static associate(models) {
      ProductVariant.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });

      ProductVariant.belongsToMany(models.AttributeValue, {
        through: models.VariantAttribute,
        foreignKey: "variant_id",
        otherKey: "attribute_value_id",
        as: "attribute_values",
      });

      ProductVariant.hasMany(models.CartItem, { foreignKey: "variant_id" });
    }
  }

  ProductVariant.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      variant_type: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      variant_value: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ProductVariant",
      tableName: "product_variants",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ProductVariant;
};
