"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      // Mỗi review thuộc về 1 product
      Review.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });

      // Mỗi review thuộc về 1 user
      Review.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // Mỗi review thuộc về 1 order
      Review.belongsTo(models.Order, {
        foreignKey: "order_id",
        as: "order",
      });

      // Nếu bạn có bảng review_images => mỗi review có nhiều ảnh
      Review.hasMany(models.ReviewMedia, {
        foreignKey: "review_id",
        as: "images",
      });
    }
  }

  Review.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rating: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      helpful_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      modelName: "Review",
      tableName: "reviews",
      underscored: true, // match created_at, updated_at
      timestamps: false, // vì bạn đã define created_at, updated_at thủ công
    }
  );

  return Review;
};
