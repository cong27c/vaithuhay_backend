// services/checkout.service.js
const {
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderAddress,
  Payment,
  Shipment,
  VoucherUsage,
  GuestSession,
  Address,
  sequelize,
} = require("../models");

exports.handleCheckout = async ({
  user,
  customerId,
  sessionId,
  formData,
  ipAddress,
  userAgent,
}) => {
  return await sequelize.transaction(async (t) => {
    // 1️⃣ Xác định giỏ hàng
    const cartWhere = {};
    if (customerId) {
      cartWhere.customer_id = customerId;
    } else if (sessionId) {
      cartWhere.session_id = sessionId;
    } else {
      throw new Error("Missing user identifier");
    }

    console.log("cartWhere", cartWhere);

    const cart = await Cart.findOne({
      where: cartWhere,
      include: [
        {
          model: CartItem,
          as: "items",
        },
      ],
      transaction: t,
    });
    console.log("cart", cart);
    console.log("cart.items", cart?.items);

    if (!cart || !cart.items.length) {
      throw new Error("Cart is empty or not found");
    }

    console.log("Processing checkout for:", {
      customerId,
      sessionId,
      cartItems: cart.items.length,
    });

    // 2️⃣ Lưu địa chỉ giao hàng - SỬA: chỉ dùng các trường có trong model
    let addressRecord;
    if (customerId) {
      // Customer - lưu vào Address table
      addressRecord = await Address.create(
        {
          customer_id: customerId,
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          province: formData.province, // Chỉ dùng province (không có province_name)
          district: formData.district, // Chỉ dùng district (không có district_name)
          ward: formData.ward, // Chỉ dùng ward (không có ward_name)
          street_address: formData.address,
          is_default: false,
          created_at: new Date(),
        },
        { transaction: t }
      );
    } else {
      // Guest - tạo GuestSession và OrderAddress
      await GuestSession.create(
        {
          session_id: sessionId,
          ip_address: ipAddress,
          // ❌ BỎ: user_agent (không có trong model)
          customer_id: null,
          created_at: new Date(),
        },
        { transaction: t }
      );

      addressRecord = await OrderAddress.create(
        {
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          province: formData.province, // Chỉ dùng province
          district: formData.district, // Chỉ dùng district
          ward: formData.ward, // Chỉ dùng ward
          street_address: formData.address,
          created_at: new Date(),
        },
        { transaction: t }
      );
    }

    // 3️⃣ Tạo Order - SỬA: chỉ dùng các trường có trong model
    const order = await Order.create(
      {
        customer_id: customerId,
        order_number: `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        order_date: new Date(),
        total_amount: cart.total_amount,
        discount_amount: cart.discount_amount || 0,
        voucher_id: cart.voucher_id || null,
        final_amount: cart.final_amount || cart.total_amount,
        status: "pending",
        created_at: new Date(),
      },
      { transaction: t }
    );

    // Liên kết địa chỉ vào Order
    if (!customerId) {
      // Guest - update OrderAddress với order_id
      await OrderAddress.update(
        { order_id: order.id },
        { where: { id: addressRecord.id }, transaction: t }
      );
    } else {
      // Customer - update Order với address_id
      await order.update({ address_id: addressRecord.id }, { transaction: t });
    }

    // 4️⃣ Tạo OrderItem
    const orderItems = [];
    for (const item of cart.items) {
      const orderItem = await OrderItem.create(
        {
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          total_price: item.total_price,
          created_at: new Date(),
        },
        { transaction: t }
      );
      orderItems.push(orderItem);
    }

    // 5️⃣ Tạo Payment - SỬA: dùng enum values đúng
    const payment = await Payment.create(
      {
        order_id: order.id,
        method: formData.paymentMethod,
        amount: order.final_amount,
        status: "pending", // Luôn là pending cho tất cả methods
        created_at: new Date(),
      },
      { transaction: t }
    );

    // 6️⃣ Tạo Shipment - SỬA: carrier phù hợp hơn
    const shipment = await Shipment.create(
      {
        order_id: order.id,
        carrier:
          formData.deliveryMethod === "home" ? "Giao hàng" : "Nhận tại store",
        status: "waiting",
        shipping_fee: 0,
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
      },
      { transaction: t }
    );

    // 7️⃣ Cập nhật VoucherUsage nếu có
    if (cart.voucher_id && customerId && user) {
      await VoucherUsage.create(
        {
          voucher_id: cart.voucher_id,
          user_id: user.id,
          order_id: order.id,
          used_at: new Date(),
        },
        { transaction: t }
      );
    }

    // 8️⃣ Xóa giỏ hàng sau khi checkout
    await CartItem.destroy({
      where: { cart_id: cart.id },
      transaction: t,
    });

    await cart.update(
      {
        status: "checkedout",
        total_amount: 0,
        // ❌ BỎ: item_count (không có trong model Cart)
      },
      { transaction: t }
    );

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        final_amount: order.final_amount,
        status: order.status,
      },
      payment: {
        id: payment.id,
        method: payment.method,
        status: payment.status,
      },
      shipment: {
        id: shipment.id,
        carrier: shipment.carrier,
        estimated_delivery: shipment.estimated_delivery,
      },
      orderItems: orderItems.length,
    };
  });
};

// address ko được lưu từ lần đặt trc
// thêm chức năng lưu address
// OrderAddress ko có bản ghi khi checkout
//
