"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserHasRole extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  UserHasRole.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expires_at: {
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
      modelName: "UserHasRole",
      tableName: "user_has_roles",
      timestamps: false,
    }
  );

  return UserHasRole;
};
