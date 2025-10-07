"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CollectionProduct extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  CollectionProduct.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      collection_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CollectionProduct",
      tableName: "collection_products",
      timestamps: false,
    }
  );

  return CollectionProduct;
};
