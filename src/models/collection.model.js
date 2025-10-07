"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Collection extends Model {
    static associate(models) {
      Collection.belongsToMany(models.Product, {
        through: models.CollectionProduct,
        foreignKey: "collection_id",
        otherKey: "product_id",
      });
    }
  }

  Collection.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Collection",
      tableName: "collections",
      timestamps: false,
    }
  );

  return Collection;
};
