"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("preorder_slots", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      registration_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "preorder_registrations",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "preorder_campaigns",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      tier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "preorder_tiers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("reserved", "confirmed", "expired", "cancelled"),
        defaultValue: "reserved",
      },
      reserved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      released_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("preorder_slots");
  },
};
