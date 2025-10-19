"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Lấy tất cả campaign_id từ bảng preorder_campaigns
    const [campaigns] = await queryInterface.sequelize.query(
      "SELECT id FROM preorder_campaigns ORDER BY id"
    );

    if (campaigns.length === 0) {
      console.log(
        "Không tìm thấy campaign nào. Vui lòng chạy seeder cho preorder_campaigns trước."
      );
      return;
    }

    const now = new Date();
    const tiersData = [];

    // Tạo tiers cho TẤT CẢ campaign
    for (const campaign of campaigns) {
      tiersData.push(
        {
          name: "Tiên phong",
          type: "super_early_bird",
          price: 1000000,
          limit_quantity: 10,
          sold_quantity: 0,
          discount_percent: 40,
          order_index: 1,
          campaign_id: campaign.id,
          created_at: now,
          updated_at: now,
        },
        {
          name: "Ưu đãi",
          type: "early_bird",
          price: 1200000,
          limit_quantity: 20,
          sold_quantity: 0,
          discount_percent: 25,
          order_index: 2,
          campaign_id: campaign.id,
          created_at: now,
          updated_at: now,
        },
        {
          name: "Đặt trước",
          type: "pre_order",
          price: 1400000,
          limit_quantity: 30,
          sold_quantity: 0,
          discount_percent: 10,
          order_index: 3,
          campaign_id: campaign.id,
          created_at: now,
          updated_at: now,
        },
        {
          name: "Niêm yết",
          type: "retail",
          price: 1600000,
          limit_quantity: 50,
          sold_quantity: 0,
          discount_percent: 0,
          order_index: 4,
          campaign_id: campaign.id,
          created_at: now,
          updated_at: now,
        }
      );
    }

    await queryInterface.bulkInsert("preorder_tiers", tiersData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("preorder_tiers", null, {});
  },
};
