"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log("Inserting shipping methods...");

      await queryInterface.bulkInsert(
        "shipping_methods",
        [
          {
            name: "Nhanh",
            description: "Giao hàng nhanh trong 1-2 ngày",

            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            name: "Thường",
            description: "Giao hàng tiêu chuẩn trong 3-5 ngày",

            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            name: "Tiết kiệm",
            description: "Giao hàng chậm, chi phí thấp trong 5-7 ngày",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        {}
      );

      console.log("Shipping methods inserted successfully");
    } catch (error) {
      console.error("Shipping methods migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete("shipping_methods", null, {});
      console.log("Shipping methods rollback completed");
    } catch (error) {
      console.error("Shipping methods rollback failed:", error);
      throw error;
    }
  },
};
