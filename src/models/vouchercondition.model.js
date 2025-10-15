"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class VoucherCondition extends Model {
    static associate(models) {
      VoucherCondition.belongsTo(models.Voucher, {
        foreignKey: "voucher_id",
        as: "Voucher",
        onDelete: "CASCADE",
      });
    }

    // Helper method để parse value từ JSON string
    getParsedValue() {
      try {
        return JSON.parse(this.condition_value); // SỬA: condition_value
      } catch (error) {
        return this.condition_value; // SỬA: condition_value
      }
    }

    // Helper method để set value dạng JSON
    setValue(data) {
      if (typeof data === "object" || Array.isArray(data)) {
        this.condition_value = JSON.stringify(data); // SỬA: condition_value
      } else {
        this.condition_value = data.toString(); // SỬA: condition_value
      }
    }
  }

  VoucherCondition.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "vouchers",
          key: "id",
        },
      },
      condition_type: {
        type: DataTypes.ENUM(
          "min_order_value",
          "category",
          "product",
          "user_group",
          "first_order",
          "specific_user",
          "time_frame"
        ),
        allowNull: false,
      },
      operator: {
        type: DataTypes.ENUM("=", ">", "<", ">=", "<=", "in", "not_in"),
        allowNull: false,
      },
      condition_value: {
        // TÊN TRƯỜNG LÀ condition_value
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("condition_value"); // SỬA: condition_value
          try {
            return JSON.parse(rawValue);
          } catch (error) {
            return rawValue;
          }
        },
        set(value) {
          if (typeof value === "object" || Array.isArray(value)) {
            this.setDataValue("condition_value", JSON.stringify(value)); // SỬA: condition_value
          } else {
            this.setDataValue("condition_value", value.toString()); // SỬA: condition_value
          }
        },
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "VoucherCondition",
      tableName: "voucher_conditions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return VoucherCondition;
};
