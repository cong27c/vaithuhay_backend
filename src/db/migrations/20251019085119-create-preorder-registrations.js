"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("preorder_registrations", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // Nếu khách hàng đã đăng nhập
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // Nếu là khách vãng lai
      guest_session_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "guest_sessions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      tier_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "preorder_tiers",
          key: "id",
        },
        allowNull: true,
      },
      campaign_id: {
        type: Sequelize.INTEGER, // hoặc Sequelize.BIGINT nếu id của preorder_campaigns là BIGINT
        allowNull: false,
        references: {
          model: "preorder_campaigns", // tên bảng tham chiếu
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: "",
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      mail_sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "pending", // pending | confirmed | canceled
      },

      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("preorder_registrations");
  },
};
