const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const orderService = require("@/services/order.service");
const { processSePayWebhook } = require("@/services/payment.service");

// 🟢 Lấy chi tiết đơn hàng (dùng để hiển thị QR code)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.getOrderById(id);

    if (!result) {
      throwError(404, "Không tìm thấy đơn hàng");
    }

    return success(res, 200, {
      success: true,
      order: result,
    });
  } catch (err) {
    return error(
      res,
      err.status || 500,
      err.message || "Lỗi lấy thông tin đơn hàng"
    );
  }
};

// 🟡 Kiểm tra trạng thái thanh toán (SePay webhook cập nhật -> FE gọi kiểm tra)
const checkTransactionExists = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.getPaymentStatus(id); // Sử dụng hàm mới

    if (!result) {
      throwError(404, "Không tìm thấy đơn hàng");
    }

    return success(res, 200, {
      success: true,
      payment_status: result.payment_status,
      order_status: result.order_status, // Trả về cả order status
      transaction_id: result.transaction_id,
      paid_at: result.paid_at,
    });
  } catch (err) {
    return error(
      res,
      err.status || 500,
      err.message || "Lỗi kiểm tra thanh toán"
    );
  }
};

const handleWebhookController = async (req, res) => {
  try {
    console.log("handleWebhookController hello");
    const result = await processSePayWebhook(req.body, req.headers);

    // REMOVE pusher triggers từ controller vì đã xử lý trong service
    // Giữ lại error handling nếu cần

    return success(res, 200, {
      success: true,
      message: "Webhook processed successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Webhook controller error:", err);

    // Giữ lại error triggering cho frontend
    if (err.orderId) {
      try {
        await pusher.trigger(`private-order-${err.orderId}`, "payment-error", {
          orderId: err.orderId,
          error: err.message,
          timestamp: new Date().toISOString(),
          type: "payment_error",
        });
      } catch (pusherError) {
        console.error("❌ Pusher error trigger failed:", pusherError);
      }
    }

    return error(res, err.status || 500, err.message);
  }
};

module.exports = {
  getOrderById,
  checkTransactionExists,
  handleWebhookController,
};
