"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      // Một địa chỉ thuộc về một khách hàng
      Address.belongsTo(models.Customer, {
        foreignKey: "customer_id",
        as: "customer",
        onDelete: "CASCADE",
      });

      // Một địa chỉ có thể được dùng trong nhiều đơn hàng
      Address.hasMany(models.Order, {
        foreignKey: "address_id",
        as: "orders",
      });
    }
  }

  Address.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: DataTypes.INTEGER,
      full_name: DataTypes.STRING(100),
      phone: DataTypes.STRING(20),
      email: DataTypes.STRING(100),
      province: DataTypes.STRING(100),
      district: DataTypes.STRING(100),
      ward: DataTypes.STRING(100),
      street_address: DataTypes.STRING(255),
      is_default: DataTypes.BOOLEAN,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Address",
      tableName: "addresses",
      timestamps: false,
    }
  );
  return Address;
};
