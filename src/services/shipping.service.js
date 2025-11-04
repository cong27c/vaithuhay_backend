const { ShippingZone, ShippingMethod, ShippingRate } = require("@/models");
const { Op } = require("sequelize");
const throwError = require("@/utils/throwError");

class ShippingService {
  // Tính toán phí vận chuyển
  async calculateShippingWithDebug({ province, district, ward, items }) {
    try {
      // 1️⃣ Tìm shipping zone (có fallback về mặc định)
      const zone = await this.findShippingZone(province, district, ward);
      if (!zone) {
        return {
          success: false,
          message: "Không tìm thấy khu vực vận chuyển phù hợp",
        };
      }

      // 2️⃣ Tính tổng trọng lượng
      const totalWeight = this.calculateTotalWeight(items);

      if (totalWeight <= 0) {
        return { success: false, message: "Trọng lượng sản phẩm không hợp lệ" };
      }

      // 3️⃣ Lấy phương thức khả dụng
      const methods = await this.getAvailableMethods(zone.id, totalWeight);

      if (methods.length === 0) {
        return {
          success: false,
          message:
            "Không có phương thức vận chuyển nào phù hợp với trọng lượng đơn hàng",
        };
      }

      // ✅ Thành công
      return {
        success: true,
        methods: methods,
        zone: zone.name,
        totalWeight,
        isDefaultZone: zone.isDefault || false, // 👈 Thêm flag để biết là zone mặc định
      };
    } catch (error) {
      console.error("Shipping calculation error:", error);
      throwError(500, "Lỗi server khi tính phí vận chuyển");
    }
  }

  // Tìm shipping zone với fallback
  async findShippingZone(province, district, ward = null) {
    try {
      let zone = null;

      // Ưu tiên 1: Tìm chính xác province + district
      if (province && district) {
        zone = await ShippingZone.findOne({
          where: { province, district },
          include: this.getZoneIncludes(),
        });
      }

      // Ưu tiên 2: Tìm theo province only
      if (!zone && province) {
        zone = await ShippingZone.findOne({
          where: { province },
          include: this.getZoneIncludes(),
        });
      }

      // Ưu tiên 3: Lấy zone random làm mặc định
      if (!zone) {
        zone = await this.getRandomDefaultZone();
      }

      return zone;
    } catch (error) {
      console.error("Error finding shipping zone:", error);
      throwError(500, "Lỗi khi tìm khu vực vận chuyển");
    }
  }

  // Lấy zone random làm mặc định
  async getRandomDefaultZone() {
    try {
      const zones = await ShippingZone.findAll({
        include: this.getZoneIncludes(),
        limit: 50, // Giới hạn để tối ưu
      });

      if (zones.length === 0) {
        return null;
      }

      // Lấy random zone
      const randomZone = zones[Math.floor(Math.random() * zones.length)];

      // Đánh dấu đây là zone mặc định
      randomZone.isDefault = true;
      randomZone.name = `${randomZone.name} (Mặc định)`;

      return randomZone;
    } catch (error) {
      console.error("Error getting random default zone:", error);
      return null;
    }
  }

  // Helper để include relations
  getZoneIncludes() {
    return [
      {
        model: ShippingRate,
        as: "rates",
        include: [
          {
            model: ShippingMethod,
            as: "method",
            attributes: ["id", "name", "description"],
          },
        ],
      },
    ];
  }

  calculateTotalWeight(items) {
    return items.reduce((total, item) => {
      if (!item.checked) return total;

      if (!item.isCombo) {
        const itemWeight = item.weight || 0;
        return total + itemWeight * item.quantity;
      } else if (item.isCombo && Array.isArray(item.products)) {
        const comboWeight = item.products.reduce((sum, p) => {
          if (!p.checked) return sum;
          const w = p.weight || 0;
          const q = p.quantity || 1;
          return sum + w * q;
        }, 0);
        return total + comboWeight * item.quantity;
      }

      return total;
    }, 0);
  }

  async getAvailableMethods(zoneId, totalWeight) {
    try {
      const rates = await ShippingRate.findAll({
        where: {
          zone_id: zoneId,
          min_weight: { [Op.lte]: totalWeight },
          max_weight: { [Op.gte]: totalWeight },
        },
        include: [
          {
            model: ShippingMethod,
            as: "method",
            attributes: ["id", "name", "description"],
          },
        ],
        order: [["price", "ASC"]],
      });

      return rates?.map((rate) => ({
        id: rate.method.id,
        name: rate.method.name,
        description: rate.method.description,
        fee: parseFloat(rate.price),
        min_weight: rate.min_weight,
        max_weight: rate.max_weight,
        estimated_days:
          rate.estimated_days || this.getDefaultEstimatedDays(rate.method.name),
      }));
    } catch (error) {
      throwError(500, "Lỗi khi lấy phương thức vận chuyển");
    }
  }

  getDefaultEstimatedDays(methodName) {
    const defaults = {
      Nhanh: 2,
      Thường: 5,
      "Tiết kiệm": 7,
    };
    return defaults[methodName] || 5;
  }

  // Các method khác giữ nguyên...
  async getAllZones() {
    try {
      return await ShippingZone.findAll({
        include: [
          {
            model: ShippingRate,
            as: "rates",
            include: [
              {
                model: ShippingMethod,
                as: "method",
              },
            ],
          },
        ],
      });
    } catch (error) {
      throwError(500, "Lỗi khi lấy danh sách khu vực");
    }
  }

  async getAllMethods() {
    try {
      return await ShippingMethod.findAll({
        include: [
          {
            model: ShippingRate,
            as: "rates",
          },
        ],
      });
    } catch (error) {
      throwError(500, "Lỗi khi lấy danh sách phương thức");
    }
  }

  async createRate(rateData) {
    try {
      const existingRate = await ShippingRate.findOne({
        where: {
          zone_id: rateData.zone_id,
          method_id: rateData.method_id,
          [Op.or]: [
            {
              min_weight: {
                [Op.between]: [rateData.min_weight, rateData.max_weight],
              },
            },
            {
              max_weight: {
                [Op.between]: [rateData.min_weight, rateData.max_weight],
              },
            },
          ],
        },
      });

      if (existingRate) {
        throwError(400, "Đã tồn tại bảng giá cho khoảng trọng lượng này");
      }

      return await ShippingRate.create({
        ...rateData,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      if (error.status === 400) throw error;
      throwError(500, "Lỗi khi tạo mới bảng giá");
    }
  }

  async updateRate(id, updateData) {
    try {
      const rate = await ShippingRate.findByPk(id);
      if (!rate) {
        throwError(404, "Không tìm thấy bảng giá");
      }

      await rate.update({
        ...updateData,
        updated_at: new Date(),
      });

      return rate;
    } catch (error) {
      if (error.status === 404) throw error;
      throwError(500, "Lỗi khi cập nhật bảng giá");
    }
  }

  async deleteRate(id) {
    try {
      const rate = await ShippingRate.findByPk(id);
      if (!rate) {
        throwError(404, "Không tìm thấy bảng giá");
      }

      await rate.destroy();
      return true;
    } catch (error) {
      if (error.status === 404) throw error;
      throwError(500, "Lỗi khi xóa bảng giá");
    }
  }
}

module.exports = new ShippingService();
