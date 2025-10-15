module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "customers", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      session_id: { type: Sequelize.STRING, allowNull: true }, // not unique to allow re-created sessions
      total_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      discount_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "vouchers", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      final_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.0 },
      status: {
        type: Sequelize.ENUM("active", "abandoned", "checkedout"),
        defaultValue: "active",
      },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Optional: index by session_id for quick lookup
    await queryInterface.addIndex("carts", ["session_id"]);
    await queryInterface.addIndex("carts", ["customer_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("carts");
  },
};
