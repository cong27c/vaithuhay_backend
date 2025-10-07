"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Suplier extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Suplier.init(
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
      contact_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Suplier",
      tableName: "supliers",
      timestamps: false,
    }
  );

  return Suplier;
};
