const { Order, Payment } = require("../models");

async function updateOrderStatus(orderId, status) {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");

  order.status = status;
  await order.save();

  // Auto sync Payment status
  const payment = await Payment.findOne({ where: { order_id: order.id } });
  if (payment) {
    if (status === "paid") payment.status = "paid";
    if (status === "payment_failed") payment.status = "failed";
    await payment.save();
  }

  // Có thể gửi event / notification tại đây
  console.log(`[Order ${orderId}] → status updated to ${status}`);
}

module.exports = { updateOrderStatus };
