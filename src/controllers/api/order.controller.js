const orderService = require("@/services/orderAdmin.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

class OrderController {
  /**
   * Lấy danh sách đơn hàng
   */
  async getOrders(req, res) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        customer_id: req.query.customer_id,
        search: req.query.search,
        payment_status: req.query.payment_status,
        shipment_status: req.query.shipment_status,
      };

      const result = await orderService.getAllOrders(filters);

      return success(res, 200, {
        message: "Lấy danh sách đơn hàng thành công",
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Lấy chi tiết đơn hàng
   */
  async getOrderDetail(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      const order = await orderService.getOrderById(id);

      return success(res, 200, {
        message: "Lấy chi tiết đơn hàng thành công",
        data: order,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user?.id;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      if (!status) {
        return throwError("Trạng thái là bắt buộc", 400);
      }

      if (!adminId) {
        return throwError("Thiếu thông tin admin", 401);
      }

      const order = await orderService.updateOrderStatus(id, status, adminId);

      return success(res, 200, {
        message: "Cập nhật trạng thái đơn hàng thành công",
        data: order,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Cập nhật thông tin thanh toán
   */
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, paid_at } = req.body;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      if (!status) {
        return throwError("Trạng thái thanh toán là bắt buộc", 400);
      }

      const validStatuses = ["pending", "paid", "failed", "refunded"];
      if (!validStatuses.includes(status)) {
        return throwError("Trạng thái thanh toán không hợp lệ", 400);
      }

      const payment = await orderService.updatePaymentStatus(id, {
        status,
        paid_at,
      });

      return success(res, 200, {
        message: "Cập nhật trạng thái thanh toán thành công",
        data: payment,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Cập nhật thông tin vận chuyển
   */
  async updateShipmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, tracking_code, carrier } = req.body;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      if (!status) {
        return throwError("Trạng thái vận chuyển là bắt buộc", 400);
      }

      const validStatuses = ["waiting", "shipping", "delivered", "failed"];
      if (!validStatuses.includes(status)) {
        return throwError("Trạng thái vận chuyển không hợp lệ", 400);
      }

      const shipment = await orderService.updateShipmentStatus(id, {
        status,
        tracking_code,
        carrier,
      });

      return success(res, 200, {
        message: "Cập nhật thông tin vận chuyển thành công",
        data: shipment,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Cập nhật thông tin đơn hàng
   */
  async updateOrder(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      // Validate allowed fields
      const allowedFields = [
        "discount_amount",
        "final_amount",
        "status",
        "voucher_id",
      ];
      const invalidFields = Object.keys(updateData).filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        return throwError(
          `Các trường không được phép cập nhật: ${invalidFields.join(", ")}`,
          400
        );
      }

      const order = await orderService.updateOrder(id, updateData);

      return success(res, 200, {
        message: "Cập nhật đơn hàng thành công",
        data: order,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Xóa đơn hàng
   */
  async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      const result = await orderService.deleteOrder(id);

      return success(res, 200, {
        message: result.message,
        data: {
          deletedOrderId: result.deletedOrderId,
        },
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Lấy analytics đơn hàng
   */
  async getOrderAnalytics(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return throwError("ID đơn hàng không hợp lệ", 400);
      }

      const analytics = await orderService.getOrderAnalytics(id);

      return success(res, 200, {
        message: "Lấy analytics đơn hàng thành công",
        data: analytics,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Lấy thống kê đơn hàng
   */
  async getOrderStats(req, res) {
    try {
      const { time_range = "month" } = req.query;

      const validTimeRanges = ["day", "week", "month"];
      if (!validTimeRanges.includes(time_range)) {
        return throwError("Khoảng thời gian không hợp lệ", 400);
      }

      const stats = await orderService.getOrderStats(time_range);

      return success(res, 200, {
        message: "Lấy thống kê đơn hàng thành công",
        data: stats,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Tìm kiếm đơn hàng nâng cao
   */
  async searchOrders(req, res) {
    try {
      const {
        phone,
        email,
        product_name,
        tracking_code,
        limit = 10,
      } = req.query;

      if (!phone && !email && !product_name && !tracking_code) {
        return throwError(
          "Vui lòng cung cấp ít nhất một tiêu chí tìm kiếm",
          400
        );
      }

      const searchCriteria = {
        phone,
        email,
        product_name,
        tracking_code,
        limit: parseInt(limit),
      };

      const orders = await orderService.searchOrders(searchCriteria);

      return success(res, 200, {
        message: "Tìm kiếm đơn hàng thành công",
        data: orders,
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  /**
   * Lấy các trạng thái có sẵn
   */
  async getOrderStatuses(req, res) {
    try {
      const statuses = [
        { value: "pending", label: "Chờ xác nhận" },
        { value: "confirmed", label: "Đã xác nhận" },
        { value: "processing", label: "Đang xử lý" },
        { value: "shipped", label: "Đang giao hàng" },
        { value: "delivered", label: "Đã giao hàng" },
        { value: "cancelled", label: "Đã hủy" },
      ];

      const paymentStatuses = [
        { value: "pending", label: "Chờ thanh toán" },
        { value: "paid", label: "Đã thanh toán" },
        { value: "failed", label: "Thanh toán thất bại" },
        { value: "refunded", label: "Đã hoàn tiền" },
      ];

      const shipmentStatuses = [
        { value: "waiting", label: "Chờ lấy hàng" },
        { value: "shipping", label: "Đang vận chuyển" },
        { value: "delivered", label: "Đã giao hàng" },
        { value: "failed", label: "Giao hàng thất bại" },
      ];

      return success(res, 200, {
        message: "Lấy danh sách trạng thái thành công",
        data: {
          order_statuses: statuses,
          payment_statuses: paymentStatuses,
          shipment_statuses: shipmentStatuses,
        },
      });
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }
}

module.exports = new OrderController();
