const pusher = require("@/config/pusher");
const { Order, Payment, sequelize } = require("@/models");
// Config – tùy chỉnh theo môi trường
const SEPAY_API_URL =
  process.env.SEPAY_API_URL || "https://my.sepay.vn/userapi";
const SEPAY_API_KEY = process.env.SEPAY_API_KEY; // từ SePay
const RECEIVER_BANK_ACCOUNT = process.env.RECEIVER_BANK_ACCOUNT; // số tài khoản bạn nhận tiền
const RECEIVER_BANK_SHORT = process.env.RECEIVER_BANK_SHORT; // mã ngân hàng short name theo SePay

/**
 * Khởi tạo thanh toán cho đơn hàng.
 * Trả về thông tin cần show cho KH (QR code URL hoặc tài khoản ngân hàng).
 */
async function initiatePayment(order) {
  try {
    // 1. Tạo nội dung chuyển khoản chứa mã đơn hàng để dễ tự động mapping
    const description = `DH${order.id}`; // ví dụ: "DH1234"

    // 2. Tạo QR Code động từ SePay
    const amount = order.total_amount;
    const qrUrl = `https://qr.sepay.vn/img?bank=${encodeURIComponent(
      RECEIVER_BANK_SHORT
    )}&acc=${encodeURIComponent(
      RECEIVER_BANK_ACCOUNT
    )}&template=compact&amount=${amount}&des=${encodeURIComponent(
      description
    )}`;

    // 3. Lưu thông tin vào đơn hàng
    await updateOrder(order.id, {
      qr_code_url: qrUrl,
      virtual_account: RECEIVER_BANK_ACCOUNT,
      payment_status: "pending",
    });

    // 4. Trả về thông tin cho front-end
    return {
      qrCodeUrl: qrUrl,
      description,
      amount,
      bankAccount: RECEIVER_BANK_ACCOUNT,
      bankShort: RECEIVER_BANK_SHORT,
      orderId: order.id,
    };
  } catch (error) {
    console.error("initiatePayment error:", error);
    throw new Error("Không thể khởi tạo thanh toán");
  }
}

/**
 * Endpoint Webhook từ SePay gọi tới khi có giao dịch.
 * Sử dụng API Key Authentication thay vì HMAC Secret
 */
async function processSePayWebhook(payload, headers) {
  console.log("Chạy vào processSePayWebhook");
  const transaction = await sequelize.transaction();
  try {
    const txId = payload.id || payload.transactionId;
    const amountIn = parseFloat(payload.transferAmount || payload.amount);
    const content = payload.content || payload.description;

    // Lấy orderId từ content
    const match = content.match(/DH(\d+)/i);
    if (!match) throw new Error("order_id_not_found");
    const orderId = parseInt(match[1], 10);

    const order = await Order.findByPk(orderId, {
      include: [{ model: Payment, as: "payment" }],
      transaction,
    });

    if (!order) throw new Error("order_not_found");

    // Kiểm tra trùng giao dịch
    const exists = await Payment.findOne({
      where: { transaction_id: txId },
      transaction,
    });
    if (exists) {
      await transaction.commit();
      return { duplicate: true };
    }

    // Tạo Payment record
    await Payment.create(
      {
        order_id: orderId,
        transaction_id: txId,
        method: "bank",
        amount: amountIn,
        status: "paid",
        paid_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // 🔥 QUAN TRỌNG: Cập nhật Order status (KHÔNG có payment_status)
    await order.update(
      {
        status: "confirmed", // Chỉ cập nhật order status
        // KHÔNG có payment_status vì nó không tồn tại trong Order model
      },
      { transaction }
    );

    await transaction.commit();

    // 🔥 Trigger Pusher events - ĐÃ SỬA DATA STRUCTURE
    await Promise.all([
      // Event thanh toán thành công
      pusher.trigger(`private-order-${orderId}`, "payment-success", {
        orderId: order.id,
        transactionId: txId,
        paidAt: new Date().toISOString(),
        amount: amountIn, // Số tiền thực tế thanh toán
      }),

      // Event cập nhật trạng thái order
      pusher.trigger(`private-order-${orderId}`, "order-status-update", {
        orderId: order.id,
        status: "confirmed", // Chỉ order status
        updatedAt: new Date().toISOString(),
      }),
    ]);

    return { success: true, orderId };
  } catch (err) {
    await transaction.rollback();
    console.log("Webhook Error:", err);
    throw err;
  }
}

async function updateOrder(orderId, updates, transaction = null) {
  try {
    const options = transaction ? { transaction } : {};
    const order = await Order.findByPk(orderId, options);
    if (!order) throw new Error("Order not found");

    await order.update(updates, options);
    return order;
  } catch (err) {
    console.error("updateOrder error:", err);
    throw err;
  }
}

async function checkTransactionDuplicate(txId) {
  try {
    const payment = await Payment.findOne({
      where: { transaction_id: txId },
    });
    return !!payment;
  } catch (err) {
    console.error("checkTransactionDuplicate error:", err);
    throw err;
  }
}

async function getPaymentByOrderId(orderId) {
  try {
    const payment = await Payment.findOne({
      where: { order_id: orderId },
      order: [["created_at", "DESC"]],
    });

    if (!payment) {
      return { success: false, payment: null };
    }

    return { success: true, payment };
  } catch (error) {
    console.error("getPaymentByOrderId error:", error);
    throw error;
  }
}

// Lưu thông tin giao dịch
async function saveTransaction(data, transaction = null) {
  try {
    const options = transaction ? { transaction } : {};
    const match = data.content.match(/DH(\d+)/i);
    if (!match) throw new Error("Order ID not found in content");

    const orderId = parseInt(match[1], 10);
    const order = await Order.findByPk(orderId, options);
    if (!order) throw new Error("Order not found");

    await Payment.create(
      {
        order_id: orderId,
        transaction_id: data.txId,
        method: "bank",
        amount: data.amountIn,
        status: "completed",
        paid_at: data.date,
        created_at: new Date(),
        updated_at: new Date(),
      },
      options
    );
  } catch (err) {
    console.error("saveTransaction error:", err);
    throw err;
  }
}

// Lấy order theo ID
async function getOrderById(orderId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Payment,
          as: "payment",
        },
      ],
    });
    return order;
  } catch (err) {
    console.error("getOrderById error:", err);
    throw err;
  }
}
module.exports = {
  initiatePayment,
  processSePayWebhook,
  checkTransactionDuplicate,
  getPaymentByOrderId,
};
