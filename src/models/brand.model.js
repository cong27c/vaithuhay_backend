"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Brand extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Brand.init(
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
      logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Brand",
      tableName: "brands",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Brand;
};
