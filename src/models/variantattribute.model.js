"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VariantAttribute extends Model {
    static associate(models) {
      VariantAttribute.belongsTo(models.ProductVariant, {
        foreignKey: "variant_id",
        as: "variant",
      });

      VariantAttribute.belongsTo(models.AttributeValue, {
        foreignKey: "attribute_value_id",
        as: "attribute_value",
      });
    }
  }

  VariantAttribute.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      variant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "product_variants",
          key: "id",
        },
      },
      attribute_value_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "attribute_values",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "VariantAttribute",
      tableName: "variant_attributes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return VariantAttribute;
};
