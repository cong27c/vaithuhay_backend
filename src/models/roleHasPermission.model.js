"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RoleHasPermission extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  RoleHasPermission.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      permission_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RoleHasPermission",
      tableName: "role_has_permissions",
      timestamps: false,
    }
  );

  return RoleHasPermission;
};
