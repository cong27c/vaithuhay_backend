"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ComboImage extends Model {
    static associate(models) {
      ComboImage.belongsTo(models.Combo, {
        foreignKey: "combo_id",
        as: "combo",
      });
      ComboImage.hasMany(models.ComboImageHotspot, {
        foreignKey: "combo_image_id",
        as: "hotspots",
      });
    }
  }

  ComboImage.init(
    {
      combo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      image_type: {
        type: DataTypes.ENUM("thumbnail", "slide", "gallery"),
        defaultValue: "gallery",
      },
      main_image: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      display_order: DataTypes.INTEGER,
      alt_text: DataTypes.STRING(255),
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ComboImage",
      tableName: "combo_images",
      underscored: true,
      timestamps: true,
    }
  );

  return ComboImage;
};
