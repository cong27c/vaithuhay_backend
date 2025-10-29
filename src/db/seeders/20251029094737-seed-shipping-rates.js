"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log("Starting shipping rates migration...");

      // Lấy tất cả zones và methods
      const [zones] = await queryInterface.sequelize.query(
        `SELECT id, province FROM shipping_zones `
      );
      const [methods] = await queryInterface.sequelize.query(
        `SELECT id, name FROM shipping_methods `
      );

      console.log(`Found ${zones.length} zones and ${methods.length} methods`);

      const shippingRates = [];
      const regionalPricing = {
        "01": { base: 20000, factor: 1.2 }, // Hà Nội - cao hơn
        79: { base: 15000, factor: 1.0 }, // HCM - chuẩn
        48: { base: 18000, factor: 1.1 }, // Đà Nẵng
        default: { base: 22000, factor: 1.3 }, // Các tỉnh khác
      };

      // Tạo rate hợp lý hơn, không tạo quá nhiều bản ghi
      for (const zone of zones) {
        const region =
          regionalPricing[zone.province] || regionalPricing["default"];

        for (const method of methods) {
          // Mỗi method có 2 khoảng trọng lượng thực tế
          const weightRanges = this.getWeightRanges(method.name, region);

          for (const range of weightRanges) {
            shippingRates.push({
              zone_id: zone.id,
              method_id: method.id,
              min_weight: range.min,
              max_weight: range.max,
              price: range.price,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      }

      console.log(`Creating ${shippingRates.length} shipping rates...`);

      if (shippingRates.length) {
        // Batch insert với kích thước nhỏ hơn
        const BATCH_SIZE = 200;
        for (let i = 0; i < shippingRates.length; i += BATCH_SIZE) {
          const batch = shippingRates.slice(i, i + BATCH_SIZE);
          await queryInterface.bulkInsert("shipping_rates", batch, {});
          console.log(`Inserted rates batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }
      }

      console.log("Shipping rates migration completed successfully");
    } catch (error) {
      console.error("Shipping rates migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete("shipping_rates", null, {});
      console.log("Shipping rates rollback completed");
    } catch (error) {
      console.error("Shipping rates rollback failed:", error);
      throw error;
    }
  },

  // Helper function để tính giá theo phương thức và khu vực
  getWeightRanges(methodName, region) {
    const basePrice = region.base;

    switch (methodName) {
      case "Nhanh":
        return [
          {
            min: 0,
            max: 2000,
            price: Math.round(basePrice * 1.8),
            estimatedDays: 1,
          },
          {
            min: 2001,
            max: 5000,
            price: Math.round(basePrice * 2.5),
            estimatedDays: 1,
          },
          {
            min: 5001,
            max: 10000,
            price: Math.round(basePrice * 3.5),
            estimatedDays: 2,
          },
          {
            min: 10001,
            max: 999999,
            price: Math.round(basePrice * 4.5),
            estimatedDays: 2,
          },
        ];

      case "Thường":
        return [
          {
            min: 0,
            max: 2000,
            price: Math.round(basePrice * 1.2),
            estimatedDays: 3,
          },
          {
            min: 2001,
            max: 5000,
            price: Math.round(basePrice * 1.8),
            estimatedDays: 4,
          },
          {
            min: 5001,
            max: 10000,
            price: Math.round(basePrice * 2.5),
            estimatedDays: 5,
          },
          {
            min: 10001,
            max: 999999,
            price: Math.round(basePrice * 3.2),
            estimatedDays: 5,
          },
        ];

      case "Tiết kiệm":
        return [
          {
            min: 0,
            max: 2000,
            price: Math.round(basePrice * 0.8),
            estimatedDays: 5,
          },
          {
            min: 2001,
            max: 5000,
            price: Math.round(basePrice * 1.2),
            estimatedDays: 6,
          },
          {
            min: 5001,
            max: 10000,
            price: Math.round(basePrice * 1.8),
            estimatedDays: 7,
          },
          {
            min: 10001,
            max: 999999,
            price: Math.round(basePrice * 2.2),
            estimatedDays: 7,
          },
        ];

      default:
        return [{ min: 0, max: 999999, price: basePrice, estimatedDays: 5 }];
    }
  },
};
