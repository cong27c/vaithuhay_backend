const {
  Order,
  OrderAddress,
  OrderItem,
  Payment,
  sequelize,
} = require("@/models");
const { updateOrderStatus } = require("./orderStatus.service");
const { initiatePayment } = require("./payment.service");
const generateOrderNumber = () => {
  // Ví dụ: 'ORD' + timestamp + random 4 chữ số
  return `ORD${Date.now()}${Math.floor(Math.random() * 10000)}`;
};

// === Checkout dành cho Customer ===
async function checkoutCustomerService(
  customerId,
  cartItems,
  formData,
  paymentMethod
) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Tạo Order
    const order = await Order.create(
      {
        customer_id: customerId,
        total_amount: calculateCartTotal(cartItems),
        payment_method: paymentMethod,
        status: "pending",
        order_number: generateOrderNumber(),
      },
      { transaction }
    );

    // 2. Tạo địa chỉ đơn hàng
    await OrderAddress.create(
      {
        order_id: order.id,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        province: formData.province,
        district: formData.district,
        ward: formData.ward,
        street_address: formData.streetAddress,
      },
      { transaction }
    );

    // 3. Lưu danh sách sản phẩm
    const items = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.quantity * item.price,
    }));
    await OrderItem.bulkCreate(items, { transaction });

    // 4. Tạo bản ghi Payment
    const payment = await Payment.create(
      {
        order_id: order.id,
        payment_method: paymentMethod,
        status: paymentMethod === "cod" ? "pending" : "initiated",
      },
      { transaction }
    );
    await transaction.commit();
    // 5. Nếu là online payment thì tạo session thanh toán
    if (paymentMethod !== "cod") {
      const paymentSession = await initiatePayment(order);
      return { success: true, paymentSession };
    }

    // 6. Nếu COD thì xác nhận luôn
    await updateOrderStatus(order.id, "confirmed");
    return { success: true, orderId: order.id };
  } catch (err) {
    await transaction.rollback();
    console.error("Checkout Customer Error:", err);
    return { success: false, message: err.message };
  }
}

// === Checkout dành cho Guest ===
async function checkoutGuestService(
  guestSessionId,
  cartItems,
  formData,
  paymentMethod
) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Tạo Order không có customer_id
    const order = await Order.create(
      {
        guest_session_id: guestSessionId,
        total_amount: calculateCartTotal(cartItems),
        payment_method: paymentMethod,
        status: "pending",
        order_number: generateOrderNumber(),
      },
      { transaction }
    );

    // 2. Tạo địa chỉ giao hàng
    await OrderAddress.create(
      {
        order_id: order.id,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        province: formData.province,
        district: formData.district,
        ward: formData.ward,
        street_address: formData.streetAddress,
      },
      { transaction }
    );

    // 3. Lưu danh sách sản phẩm
    const items = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.quantity * item.price,
    }));
    await OrderItem.bulkCreate(items, { transaction });

    // 4. Tạo Payment
    const payment = await Payment.create(
      {
        order_id: order.id,
        payment_method: paymentMethod,
        status: paymentMethod === "cod" ? "pending" : "initiated",
      },
      { transaction }
    );
    await transaction.commit();
    // 5. Thanh toán online → tạo phiên
    if (paymentMethod !== "cod") {
      const paymentSession = await initiatePayment(order);
      return { success: true, paymentSession };
    }

    // 6. COD → xác nhận luôn
    await updateOrderStatus(order.id, "confirmed");
    return { success: true, orderId: order.id };
  } catch (err) {
    await transaction.rollback();
    console.error("Checkout Guest Error:", err);
    return { success: false, message: err.message };
  }
}

// Helper tính tổng tiền
function calculateCartTotal(cartItems) {
  console.log("cartItems", cartItems);
  return cartItems.reduce((sum, item) => sum + +item.price * +item.quantity, 0);
}

module.exports = {
  checkoutCustomerService,
  checkoutGuestService,
};
