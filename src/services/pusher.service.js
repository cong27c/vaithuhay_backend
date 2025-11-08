const pusher = require("@/config/pusher");
const { Order } = require("@/models");

/**
 * Authenticate a private Pusher channel
 * @param {string} socketId
 * @param {string} channelName
 * @param {Object} user
 * @param {Object} guestSession
 * @returns {Object} Pusher auth object
 */
const authenticateChannel = async (
  socketId,
  channelName,
  customerId,
  sessionId
) => {
  const orderId = parseInt(channelName.split("-")[2], 10);
  if (!orderId) throw new Error("Invalid channel name");

  let authorized = false;

  // Tìm order trước
  const order = await Order.findByPk(orderId);

  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }

  // 1️⃣ Customer
  if (customerId) {
    if (
      order.customer_id &&
      order.customer_id.toString() === customerId.toString()
    ) {
      authorized = true;
    }
  }
  // 2️⃣ Guest
  else if (sessionId) {
    authorized = true;
  }

  if (!authorized) {
    const err = new Error("Unauthorized");
    err.status = 403;
    throw err;
  }

  // Return Pusher auth object
  return pusher.authenticate(socketId, channelName);
};
module.exports = { authenticateChannel };
