"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsToMany(models.Collection, {
        through: models.CollectionProduct,
        foreignKey: "product_id",
        otherKey: "collection_id",
        as: "collections",
      });
      Product.hasMany(models.ProductImage, {
        foreignKey: "product_id",
        as: "images",
      });

      Product.hasOne(models.ProductImage, {
        foreignKey: "product_id",
        as: "mainImage",
        where: { is_main: true },
      });

      Product.hasOne(models.ProductDiscount, {
        foreignKey: "product_id",
        as: "discount",
      });
      Product.hasOne(models.ProductDetail, {
        foreignKey: "product_id",
        as: "detail",
      });
      Product.hasMany(models.Review, {
        foreignKey: "product_id",
        as: "reviews",
      });
      Product.hasMany(models.ProductVariant, {
        foreignKey: "product_id",
        as: "variants",
      });

      Product.belongsToMany(models.Blog, {
        through: models.BlogProduct,
        foreignKey: "product_id",
        otherKey: "blog_id",
        as: "blogs",
      });

      Product.hasMany(models.OrderItem, { foreignKey: "product_id" });
      Product.belongsToMany(models.Order, {
        through: models.OrderItem,
        foreignKey: "product_id",
        otherKey: "order_id",
        as: "orders",
      });
      Product.hasMany(models.CartItem, {
        foreignKey: "product_id",
        as: "CartItem",
      });

      Product.belongsToMany(models.Combo, {
        through: models.ComboProduct,
        foreignKey: "product_id",
        otherKey: "combo_id",
        as: "combos",
      });

      Product.hasMany(models.ComboProduct, {
        foreignKey: "product_id",
        as: "comboProducts",
      });
    }
  }

  Product.init(
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
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      weight: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        comment: "Trọng lượng sản phẩm (gram)",
      },
      release_date: DataTypes.DATE, // Thêm mới
      status: {
        type: DataTypes.ENUM("coming_soon", "pre_order", "available"),
        defaultValue: "coming_soon",
      },
      brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Product",
      tableName: "products",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Product;
};
