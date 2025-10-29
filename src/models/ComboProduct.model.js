"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ComboProduct extends Model {
    static associate(models) {
      ComboProduct.belongsTo(models.Combo, {
        foreignKey: "combo_id",
        as: "combo",
      });
      ComboProduct.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });
    }
  }

  ComboProduct.init(
    {
      combo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "ComboProduct",
      tableName: "combo_products",
      underscored: true,
      timestamps: true,
    }
  );

  return ComboProduct;
};
