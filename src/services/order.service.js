const { Order } = require("@/models");

const getOrderById = async (orderId) => {
  const order = await Order.findByPk(orderId);
  if (!order) return null;

  return {
    id: order.id,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    qr_code_url: order.qr_code_url,
    bank_name: order.bank_name || "SePay",
    virtual_account: order.virtual_account,
    account_holder: order.account_holder,
    transfer_content: order.transfer_content,
  };
};

const checkTransactionExists = async (orderId) => {
  const order = await Order.findByPk(orderId);
  return order || null;
};

module.exports = {
  getOrderById,
  checkTransactionExists,
};
