"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductPolicy extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  ProductPolicy.init(
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
      policy_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "ProductPolicy",
      tableName: "product_policies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return ProductPolicy;
};
