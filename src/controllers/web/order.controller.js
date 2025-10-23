const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const orderService = require("@/services/order.service");

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
    const result = await orderService.checkTransactionExists(id);

    if (!result) {
      throwError(404, "Không tìm thấy đơn hàng");
    }

    return success(res, 200, {
      success: true,
      status: result.payment_status,
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
    if (result.success && result.orderId) {
      try {
        // Trigger event đến private channel của order
        await pusher.trigger(
          `private-order-${result.orderId}`,
          "payment-success",
          {
            orderId: result.orderId,
            transactionId: result.transactionId,
            amount: result.amount,
            paidAt: new Date().toISOString(),
            message: "Thanh toán thành công",
            type: "payment_success",
          }
        );

        // Trigger event đến admin channel
        await pusher.trigger("private-admin-channel", "new-payment", {
          orderId: result.orderId,
          transactionId: result.transactionId,
          amount: result.amount,
          paidAt: new Date().toISOString(),
          type: "new_payment",
        });

        console.log(`✅ Pusher events sent for order ${result.orderId}`);
      } catch (pusherError) {
        console.error("❌ Pusher trigger error:", pusherError);
        // Không throw error để không ảnh hưởng response chính
      }
    }

    return success(res, 200, {
      success: true,
      message: "Webhook processed successfully",
      data: result,
    });
  } catch (err) {
    console.error("❌ Webhook controller error:", err);

    // 🔥 TRIGGER ERROR EVENT NẾU CÓ ORDERID
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
