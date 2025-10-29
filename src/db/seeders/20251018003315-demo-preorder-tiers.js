"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Lấy tất cả campaign_id từ bảng preorder_campaigns
    const [campaigns] = await queryInterface.sequelize.query(
      "SELECT id FROM preorder_campaigns ORDER BY id"
    );

    if (campaigns.length === 0) {
      console.log(
        "⚠️ Không tìm thấy campaign nào. Vui lòng chạy seeder cho preorder_campaigns trước."
      );
      return;
    }

    const now = new Date();
    const tiersData = [];

    // Tạo tiers cho từng campaign
    for (const campaign of campaigns) {
      // Các tier cơ bản
      const tiers = [
        {
          name: "Tiên phong",
          type: "super_early_bird",
          price: 1000000,
          limit_quantity: 10,
          discount_percent: 40,
          order_index: 1,
        },
        {
          name: "Ưu đãi",
          type: "early_bird",
          price: 1200000,
          limit_quantity: 20,
          discount_percent: 25,
          order_index: 2,
        },
        {
          name: "Đặt trước",
          type: "pre_order",
          price: 1400000,
          limit_quantity: 30,
          discount_percent: 10,
          order_index: 3,
        },
        {
          name: "Niêm yết",
          type: "retail",
          price: 1600000,
          limit_quantity: 50,
          discount_percent: 0,
          order_index: 4,
        },
      ];

      let canSellNext = true; // Cho phép random sold_quantity theo thứ tự

      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        let sold = 0;

        if (canSellNext) {
          // Random số lượng đã bán từ 0 đến limit_quantity
          sold = Math.floor(Math.random() * (tier.limit_quantity + 1));

          // Nếu tier này chưa full thì dừng ở đây
          if (sold < tier.limit_quantity) {
            canSellNext = false;
          }
        } else {
          sold = 0; // Các tier sau không được bán
        }

        tiersData.push({
          name: tier.name,
          type: tier.type,
          price: tier.price,
          limit_quantity: tier.limit_quantity,
          sold_quantity: sold,
          discount_percent: tier.discount_percent,
          order_index: tier.order_index,
          campaign_id: campaign.id,
          created_at: now,
          updated_at: now,
        });
      }
    }

    await queryInterface.bulkInsert("preorder_tiers", tiersData, {});
    console.log(
      `✅ Đã tạo ${tiersData.length} tiers với sold_quantity ngẫu nhiên hợp lý!`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("preorder_tiers", null, {});
  },
};
