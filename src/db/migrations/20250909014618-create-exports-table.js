"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("exports", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      export_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      from_store_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "stores",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      to_store_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "stores",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      export_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      shipped_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      carrier: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      tracking_number: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      total_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_value: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "pending",
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      shipped_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("exports");
  },
};
