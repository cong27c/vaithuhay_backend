"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  Customer.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: DataTypes.INTEGER,
      first_name: DataTypes.STRING(50),
      last_name: DataTypes.STRING(50),
      email: { type: DataTypes.STRING(100), allowNull: false },
      phone: DataTypes.STRING(20),
      address: DataTypes.TEXT,
      is_guest: { type: DataTypes.BOOLEAN, defaultValue: false },
      guest_token: DataTypes.STRING,
      converted_at: DataTypes.DATE,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Customer",
      tableName: "customers",
      timestamps: false,
    }
  );

  return Customer;
};
