const pusher = require("@/config/pusher");
const { Order, Payment } = require("@/models");
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
  // 1. Xác thực API Key
  const authHeader = headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Apikey ")) {
    const err = new Error("missing_authorization");
    err.status = 401;
    throw err;
  }

  const receivedApiKey = authHeader.replace("Apikey ", "");
  if (receivedApiKey !== SEPAY_API_KEY) {
    const err = new Error("invalid_api_key");
    err.status = 401;
    throw err;
  }

  // 2. Lấy dữ liệu giao dịch
  const txId = payload.id || payload.transactionId;
  const amountIn = parseFloat(payload.transferAmount || payload.amount);
  const accNumber = payload.accountNumber || payload.senderAccount;
  const content = payload.content || payload.description;

  if (!txId || !amountIn || !accNumber || !content) {
    const err = new Error("missing_required_fields");
    err.status = 400;
    throw err;
  }

  // 3. Kiểm tra trùng giao dịch
  const exists = await checkTransactionExists(txId);
  if (exists) return { duplicate: true };

  // 4. Lưu log giao dịch
  await saveTransaction({
    txId,
    accountNumber: accNumber,
    amountIn,
    content,
    bank: payload.gateway || payload.bankCode,
    date: payload.transactionDate || new Date(),
    raw: payload,
  });

  // 5. Lấy orderId từ content
  const match = content.match(/DH(\d+)/i);
  if (!match) {
    const err = new Error("order_id_not_found");
    err.status = 400;
    throw err;
  }
  const orderId = parseInt(match[1], 10);

  const order = await getOrderById(orderId);
  if (!order) {
    const err = new Error("order_not_found");
    err.status = 400;
    throw err;
  }

  if (order.payment_status !== "pending")
    return { orderId, alreadyProcessed: true };

  // 6. Kiểm tra số tiền
  if (Math.abs(order.total_amount - amountIn) > 0.01) {
    await updateOrder(orderId, { payment_status: "amount_mismatch" });
    const err = new Error("amount_mismatch");
    err.status = 400;
    throw err;
  }

  // 7. Cập nhật order thành paid
  await updateOrder(orderId, {
    payment_status: "paid",
    paid_at: new Date(),
    paid_amount: amountIn,
    transaction_id: txId,
  });

  // 8. 🔥 GỬI REAL-TIME NOTIFICATION QUA PUSHER
  try {
    // Gửi đến private channel của order cụ thể
    await pusher.trigger(`private-order-${orderId}`, "payment-success", {
      orderId: orderId,
      transactionId: txId,
      amount: amountIn,
      paidAt: new Date().toISOString(),
      message: "Thanh toán thành công",
      type: "payment_success",
    });

    // Gửi đến admin channel để theo dõi
    await pusher.trigger("private-admin-channel", "new-payment", {
      orderId: orderId,
      transactionId: txId,
      amount: amountIn,
      customerInfo: order.customer_info, // nếu có
      paidAt: new Date().toISOString(),
      type: "new_payment",
    });

    console.log(`✅ Pusher event sent for order ${orderId}`);
  } catch (pusherError) {
    console.error("❌ Pusher trigger error:", pusherError);
    // Không throw error ở đây để không ảnh hưởng đến flow chính
  }

  return { success: true, orderId };
}

async function updateOrder(orderId, updates) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    // Nếu có cập nhật amount, status, qr_code_url, virtual_account, paid_at...
    await order.update(updates);
    return order;
  } catch (err) {
    console.error("updateOrder error:", err);
    throw err;
  }
}

// Kiểm tra transaction đã tồn tại chưa
async function checkTransactionExists(txId) {
  try {
    const payment = await Payment.findOne({
      where: { transaction_id: txId },
    });
    return !!payment;
  } catch (err) {
    console.error("checkTransactionExists error:", err);
    throw err;
  }
}

// Lưu thông tin giao dịch
async function saveTransaction({
  txId,
  accountNumber,
  amountIn,
  content,
  bank,
  date,
  raw,
}) {
  try {
    // Lưu vào Payment (update order_id dựa trên content DH<id>)
    const match = content.match(/DH(\d+)/i);
    if (!match) throw new Error("Order ID not found in content");
    const orderId = parseInt(match[1], 10);

    const order = await Order.findByPk(orderId);
    if (!order) throw new Error("Order not found");

    // Tạo hoặc cập nhật payment
    await Payment.create({
      order_id: orderId,
      transaction_id: txId,
      method: "bank", // tạm mặc định là bank, bạn có thể parse từ raw.gateway
      amount: amountIn,
      status: "pending",
      paid_at: null,
      created_at: date,
      updated_at: date,
    });
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
module.exports = { initiatePayment, processSePayWebhook };
