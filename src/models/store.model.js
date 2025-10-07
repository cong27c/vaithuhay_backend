"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  Store.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      store_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "retail",
        validate: {
          isIn: [["retail", "warehouse", "online", "distributor", "3pl"]],
        },
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      contact_person: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      province: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "active",
        validate: {
          isIn: [["active", "inactive", "closed"]],
        },
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Store",
      tableName: "stores",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Store;
};
