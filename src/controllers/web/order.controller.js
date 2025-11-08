const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const orderService = require("@/services/order.service");
const {
  processSePayWebhook,
  getPaymentByOrderId,
} = require("@/services/payment.service");

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
    const result = await processSePayWebhook(req.body, req.headers);

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

const getReviewableOrders = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.user?.customerId || null;
    let sessionId = null;

    if (!customerId) {
      sessionId = req.guestSession?.session_id;
      if (!sessionId) {
        return error(
          res,
          401,
          "Unauthorized",
          "Vui lòng đăng nhập để đánh giá"
        );
      }
    }

    if (!productId) {
      return error(res, 400, "Thiếu thông tin", "Product ID là bắt buộc");
    }

    const orders = await orderService.getCompletedOrders(
      parseInt(productId),
      customerId,
      sessionId
    );

    return success(
      res,
      200,
      {
        orders, // Chỉ trả về mảng orders với id, order_number, order_date
      },
      "Lấy danh sách đơn hàng có thể review thành công"
    );
  } catch (err) {
    console.error("Error in getReviewableOrders:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

const getPaymentByOrderIdController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getPaymentByOrderId(parseInt(orderId));

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("getPaymentByOrderIdController error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

module.exports = {
  getOrderById,
  checkTransactionExists,
  handleWebhookController,
  getReviewableOrders,
  getPaymentByOrderIdController,
};
