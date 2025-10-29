const shippingService = require("@/services/shipping.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const shippingController = {
  // API tính phí vận chuyển
  calculateShipping: async (req, res) => {
    try {
      const { province, district, ward, items } = req.body;

      // Validation
      if (!province) {
        throwError(400, "Thiếu thông tin tỉnh/thành phố");
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throwError(400, "Danh sách sản phẩm không hợp lệ");
      }

      const result = await shippingService.calculateShippingWithDebug({
        province,
        district,
        ward,
        items,
      });

      if (!result.success) {
        throwError(
          404,
          result.message || "Không tìm thấy phương thức vận chuyển phù hợp"
        );
      }

      return success(res, 200, {
        methods: result.methods,
        zone: result.zone,
        totalWeight: result.totalWeight,
        message: "Tính phí vận chuyển thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },

  // API lấy danh sách zones
  getZones: async (req, res) => {
    try {
      const zones = await shippingService.getAllZones();

      return success(res, 200, {
        data: zones,
        total: zones.length,
        message: "Lấy danh sách khu vực thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },

  // API lấy danh sách methods
  getMethods: async (req, res) => {
    try {
      const methods = await shippingService.getAllMethods();

      return success(res, 200, {
        data: methods,
        total: methods.length,
        message: "Lấy danh sách phương thức thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },

  // API tạo mới shipping rate
  createRate: async (req, res) => {
    try {
      const { zone_id, method_id, min_weight, max_weight, price } = req.body;

      // Validation
      if (!zone_id || !method_id || !price) {
        throwError(400, "Thiếu thông tin bắt buộc: zone_id, method_id, price");
      }

      if (min_weight < 0 || max_weight < 0 || price < 0) {
        throwError(400, "Giá trị không được âm");
      }

      if (min_weight >= max_weight) {
        throwError(
          400,
          "Trọng lượng tối thiểu phải nhỏ hơn trọng lượng tối đa"
        );
      }

      const newRate = await shippingService.createRate({
        zone_id,
        method_id,
        min_weight,
        max_weight,
        price,
      });

      return success(res, 201, {
        data: newRate,
        message: "Tạo mới bảng giá thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },

  // API cập nhật shipping rate
  updateRate: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        throwError(400, "Thiếu ID bảng giá");
      }

      const updatedRate = await shippingService.updateRate(id, updateData);

      return success(res, 200, {
        data: updatedRate,
        message: "Cập nhật bảng giá thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },

  // API xóa shipping rate
  deleteRate: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        throwError(400, "Thiếu ID bảng giá");
      }

      await shippingService.deleteRate(id);

      return success(res, 200, {
        message: "Xóa bảng giá thành công",
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  },
};

module.exports = shippingController;
