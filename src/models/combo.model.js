"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Combo extends Model {
    static associate(models) {
      Combo.hasMany(models.ComboImage, {
        foreignKey: "combo_id",
        as: "images",
      });
      Combo.hasMany(models.ComboProduct, {
        foreignKey: "combo_id",
        as: "products",
      });
    }
  }

  Combo.init(
    {
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      author: DataTypes.STRING,
      description: DataTypes.TEXT,
      created_by: DataTypes.STRING(100),
      style: DataTypes.STRING(100),
      discount_value: DataTypes.FLOAT,
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Combo",
      tableName: "combos",
      underscored: true,
      timestamps: true,
    }
  );

  return Combo;
};
