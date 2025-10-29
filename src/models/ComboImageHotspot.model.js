"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ComboImageHotspot extends Model {
    static associate(models) {
      ComboImageHotspot.belongsTo(models.ComboImage, {
        foreignKey: "combo_image_id",
        as: "combo_image",
      });
      ComboImageHotspot.belongsTo(models.Product, {
        foreignKey: "product_id",
        as: "product",
      });
    }
  }

  ComboImageHotspot.init(
    {
      combo_image_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      top_position: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      left_position: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      link_url: DataTypes.STRING(500),
      tooltip_text: DataTypes.STRING(255),
      display_order: DataTypes.INTEGER,
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ComboImageHotspot",
      tableName: "combo_image_hotspots",
      underscored: true,
      timestamps: true,
    }
  );

  return ComboImageHotspot;
};
