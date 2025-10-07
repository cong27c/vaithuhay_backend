"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Attribute extends Model {
    static associate(models) {
      Attribute.hasMany(models.AttributeValue, {
        foreignKey: "attribute_id",
        as: "values",
      });
    }
  }

  Attribute.init(
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
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Attribute",
      tableName: "attributes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Attribute;
};
