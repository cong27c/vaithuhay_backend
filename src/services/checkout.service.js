const {
  Order,
  OrderAddress,
  OrderItem,
  Payment,
  sequelize,
} = require("@/models");
const { updateOrderStatus } = require("./orderStatus.service");
const { initiatePayment } = require("./payment.service");

// === Helper tạo order number ===
const generateOrderNumber = () => {
  return `ORD${Date.now()}${Math.floor(Math.random() * 10000)}`;
};

// === Helper tính tổng tiền giỏ hàng ===
function calculateCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + +item.price * +item.quantity, 0);
}

// === Helper build OrderItem từ cartItems (hỗ trợ combo và sản phẩm đơn lẻ) ===
function buildOrderItems(cartItems, orderId) {
  try {
    return cartItems.flatMap((item) => {
      if (!item.isCombo) {
        // Sản phẩm đơn lẻ
        return [
          {
            order_id: orderId,
            product_id: item.id,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
          },
        ];
      } else {
        // Combo → tách thành nhiều sản phẩm
        return item.products.map((p) => ({
          order_id: orderId,
          product_id: p.id,
          variant_id: p.variant_id || null,
          quantity: (p.quantity || 1) * item.quantity, // nhân với số lượng combo
          unit_price: p.price,
          total_price: p.price * (p.quantity || 1) * item.quantity,
        }));
      }
    });
  } catch (error) {
    console.log(error);
  }
}

// === Checkout dành cho Customer ===
async function checkoutCustomerService(
  customerId,
  cartItems,
  formData,
  paymentMethod,
  shippingFee
) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Tạo Order
    const order = await Order.create(
      {
        customer_id: customerId,
        total_amount: +calculateCartTotal(cartItems) + shippingFee,
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
    const items = buildOrderItems(cartItems, order.id);
    await OrderItem.bulkCreate(items, { transaction });

    // 4. Tạo bản ghi Payment
    await Payment.create(
      {
        order_id: order.id,
        payment_method: paymentMethod,
        status: "pending",
        amount: order.total_amount,
      },
      { transaction }
    );

    // 5. Commit transaction
    await transaction.commit();

    // 6. Xử lý thanh toán
    if (paymentMethod !== "cod") {
      const paymentSession = await initiatePayment(order);
      return { success: true, paymentSession };
    }

    // COD → xác nhận luôn
    await updateOrderStatus(order.id, "confirmed");
    await Payment.update(
      { status: "paid", paid_at: new Date() },
      { where: { order_id: order.id } }
    );

    return { success: true, orderId: order.id };
  } catch (err) {
    await transaction.rollback();
    console.log("Checkout Customer Error:", err);
    return { success: false, message: err.message };
  }
}

// === Checkout dành cho Guest ===
async function checkoutGuestService(
  guestSessionId,
  cartItems,
  formData,
  paymentMethod,
  shippingFee
) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Tạo Order không có customer_id
    const order = await Order.create(
      {
        guest_session_id: guestSessionId,
        total_amount: +calculateCartTotal(cartItems) + shippingFee,
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
    const items = buildOrderItems(cartItems, order.id);
    await OrderItem.bulkCreate(items, { transaction });

    // 4. Tạo Payment
    await Payment.create(
      {
        order_id: order.id,
        payment_method: paymentMethod,
        status: "pending",
        amount: order.total_amount,
      },
      { transaction }
    );

    // 5. Commit transaction
    await transaction.commit();

    // 6. Xử lý thanh toán
    if (paymentMethod !== "cod") {
      const paymentSession = await initiatePayment(order);
      return { success: true, paymentSession };
    }

    // COD → xác nhận luôn
    await updateOrderStatus(order.id, "confirmed");
    await Payment.update(
      { status: "paid", paid_at: new Date() },
      { where: { order_id: order.id } }
    );

    return { success: true, orderId: order.id };
  } catch (err) {
    await transaction.rollback();
    console.log("Checkout Guest Error:", err);
    return { success: false, message: err.message };
  }
}

module.exports = {
  checkoutCustomerService,
  checkoutGuestService,
};
