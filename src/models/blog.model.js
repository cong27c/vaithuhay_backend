"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Blog extends Model {
    static associate(models) {
      Blog.belongsToMany(models.Product, {
        through: models.BlogProduct,
        foreignKey: "blog_id",
        otherKey: "product_id",
        as: "products",
      });
    }
  }

  Blog.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      author: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      content_html: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },

      content_text: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("setup-decor", "product", "cong-nghe"),
        allowNull: false,
        defaultValue: "system",
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [["draft", "published"]],
        },
      },
    },
    {
      sequelize,
      modelName: "Blog",
      tableName: "blogs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Blog;
};
