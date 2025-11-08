const {
  Order,
  OrderAddress,
  OrderItem,
  Payment,
  sequelize,
  Shipment,
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
  console.log(cartItems);
  try {
    return cartItems.flatMap((item) => {
      // 🧩 Nếu không phải combo → xử lý như bình thường
      if (!item.isCombo) {
        return [
          {
            order_id: orderId,
            product_id: item.productId,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: item.discountValue || 0,
            total_price:
              (item.price - (item.discountValue || 0)) * item.quantity,
          },
        ];
      }

      // 🎁 Nếu là combo
      const comboDiscount = item.discountValue || 0;
      const comboQuantity = item.quantity;

      // 1️⃣ Tính tổng giá gốc của combo (chưa giảm)
      const totalOriginal = item.products.reduce(
        (sum, p) => sum + p.price * (p.quantity || 1),
        0
      );

      // 2️⃣ Tính tỷ lệ giảm giá (phân bổ discount theo tỉ lệ giá gốc)
      const discountRate =
        totalOriginal > 0 ? comboDiscount / totalOriginal : 0;

      // 3️⃣ Tạo các order item con, mỗi item có phần giảm giá tương ứng
      return item.products.map((p) => {
        const baseQty = (p.quantity || 1) * comboQuantity;
        const baseTotal = p.price * baseQty;

        // Phần giảm tương ứng theo tỷ lệ
        const distributedDiscount = baseTotal * discountRate;
        const totalAfterDiscount = baseTotal - distributedDiscount;

        return {
          order_id: orderId,
          product_id: p.id,
          variant_id: p.variant_id || null,
          quantity: baseQty,
          unit_price: p.price,
          discount_amount: distributedDiscount,
          total_price: totalAfterDiscount,
        };
      });
    });
  } catch (error) {
    console.error("buildOrderItems error:", error);
    return [];
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
        method: paymentMethod,
        status: "pending",
        amount: order.total_amount,
      },
      { transaction }
    );

    // === THÊM PHẦN TẠO SHIPMENT ===
    await Shipment.create(
      {
        order_id: order.id,
        carrier: formData.carrier || "default_carrier", // Lấy từ formData hoặc giá trị mặc định
        tracking_code: generateTrackingCode(), // Hàm tạo mã tracking
        status: "waiting",
        shipping_fee: shippingFee,
        created_at: new Date(),
        updated_at: new Date(),
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
        method: paymentMethod,
        status: "pending",
        amount: order.total_amount,
      },
      { transaction }
    );

    // === THÊM PHẦN TẠO SHIPMENT ===
    await Shipment.create(
      {
        order_id: order.id,
        carrier: formData.carrier || "default_carrier",
        tracking_code: generateTrackingCode(),
        status: "waiting",
        shipping_fee: shippingFee,
        created_at: new Date(),
        updated_at: new Date(),
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

// === Hàm hỗ trợ tạo mã tracking ===
function generateTrackingCode() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TRK${timestamp}${random}`.toUpperCase();
}

module.exports = {
  checkoutCustomerService,
  checkoutGuestService,
};
