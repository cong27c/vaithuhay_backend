"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AttributeValue extends Model {
    static associate(models) {
      AttributeValue.belongsTo(models.Attribute, {
        foreignKey: "attribute_id",
        as: "attribute",
      });

      AttributeValue.belongsToMany(models.ProductVariant, {
        through: models.VariantAttribute,
        foreignKey: "attribute_value_id",
        otherKey: "variant_id",
        as: "variants",
      });
    }
  }

  AttributeValue.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      attribute_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "attributes",
          key: "id",
        },
      },
      value: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "AttributeValue",
      tableName: "attribute_values",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return AttributeValue;
};
