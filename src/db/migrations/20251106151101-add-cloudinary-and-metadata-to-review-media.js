"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("review_media", "cloudinary_public_id", {
      type: Sequelize.STRING,
      allowNull: true, // 👈 nếu bạn muốn đặt ngay sau cột url (có thể bỏ nếu không cần)
    });

    await queryInterface.addColumn("review_media", "metadata", {
      type: Sequelize.JSON,
      allowNull: true,
      after: "cloudinary_public_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("review_media", "metadata");
    await queryInterface.removeColumn("review_media", "cloudinary_public_id");
  },
};
