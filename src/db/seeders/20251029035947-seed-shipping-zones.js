"use strict";

const vp = require("vietnam-provinces");

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log("Starting shipping zones migration...");

      // Chỉ lấy các tỉnh/thành phố lớn để giảm số lượng zones
      const majorProvinceCodes = [
        "01",
        "79",
        "48",
        "92",
        "31",
        "31",
        "36",
        "34",
      ]; // HN, HCM, ĐN, Cần Thơ, Hải Phòng, Thái Nguyên, Bình Dương, Bắc Ninh
      const provinces = vp
        .getProvinces()
        .filter((p) => majorProvinceCodes.includes(p.code));

      const shippingZones = [];
      let totalDistricts = 0;

      for (const province of provinces) {
        const districts = vp.getDistricts(province.code);
        totalDistricts += districts.length;

        // Chỉ tạo zones cho các quận/huyện trung tâm của tỉnh thành lớn
        for (const district of districts) {
          // Giới hạn số lượng districts per province để tránh quá nhiều bản ghi
          if (
            shippingZones.filter((z) => z.province === province.code).length >=
            10
          ) {
            break;
          }

          shippingZones.push({
            name: `${province.name} - ${district.name}`,
            province: province.code,
            district: district.code,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      console.log(
        `Creating ${shippingZones.length} shipping zones from ${provinces.length} provinces...`
      );

      if (shippingZones.length) {
        // Chia nhỏ batch insert để tránh quá tải
        const BATCH_SIZE = 100;
        for (let i = 0; i < shippingZones.length; i += BATCH_SIZE) {
          const batch = shippingZones.slice(i, i + BATCH_SIZE);
          await queryInterface.bulkInsert("shipping_zones", batch, {});
          console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }
      }

      console.log("Shipping zones migration completed successfully");
    } catch (error) {
      console.error("Shipping zones migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete("shipping_zones", null, {});
      console.log("Shipping zones rollback completed");
    } catch (error) {
      console.error("Shipping zones rollback failed:", error);
      throw error;
    }
  },
};
