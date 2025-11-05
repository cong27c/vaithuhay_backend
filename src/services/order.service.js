const {
  Order,
  Payment,
  OrderAddress,
  OrderItem,
  Product,
  ProductVariant,
  Voucher,
  ProductImage,
} = require("@/models");

const getOrderById = async (orderId) => {
  const order = await Order.findByPk(orderId, {
    include: [
      {
        model: Payment,
        as: "payment",
      },
      {
        model: OrderAddress,
        as: "orderAddress",
      },
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product, // giả sử có model Product
            as: "product",
            include: [
              {
                model: ProductImage,
                as: "images",
                required: false,
              },
            ],
          },
          {
            model: ProductVariant, // giả sử có model ProductVariant
            as: "variant",
          },
        ],
      },
      {
        model: Voucher,
        as: "voucher",
      },
    ],
  });

  if (!order) return null;

  return {
    id: order.id,
    order_number: order.order_number,
    total_amount: order.total_amount,
    status: order.status, // trạng thái order
    created_at: order.created_at,
    qr_code_url: order.qr_code_url,
    virtual_account: order.virtual_account,
    // Thanh toán
    payment: order.payment
      ? {
          method: order.payment.method,
          status: order.payment.status,
          amount: order.payment.amount,
          paid_at: order.payment.paid_at,
          transaction_id: order.payment.transaction_id,
        }
      : null,
    // Địa chỉ giao hàng
    address: order?.orderAddress
      ? {
          full_name: order.orderAddress.full_name,
          phone: order.orderAddress.phone,
          email: order.orderAddress.email,
          province: order.orderAddress.province,
          district: order.orderAddress.district,
          ward: order.orderAddress.ward,
          street_address: order.orderAddress.street_address,
        }
      : null,
    // Danh sách sản phẩm
    items: order.items
      ? order.items.map((item) => {
          const product = item.product;

          let mainImage = product?.images?.find((img) => img.is_main);
          if (!mainImage && product?.images?.length > 0) {
            mainImage = product.images[0]; // fallback ảnh đầu tiên
          }

          return {
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            total_price: item.total_price,
            product_name: product?.name,
            variant_name: item.variant?.name,
            product_image: mainImage ? mainImage.image_url : null, // ✅ ảnh chính hoặc fallback
          };
        })
      : [],
    // Voucher
    voucher: order.voucher
      ? {
          code: order.voucher.code,
          description: order.voucher.description,
          type: order.voucher.voucher_type,
          value: order.voucher.voucher_value,
        }
      : null,
  };
};

// Đổi tên cho rõ ràng
const checkOrderExists = async (orderId) => {
  const order = await Order.findByPk(orderId);
  return order || null;
};

// Thêm hàm kiểm tra trạng thái thanh toán chi tiết
const getPaymentStatus = async (orderId) => {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Payment, as: "payment" }],
  });

  if (!order) return null;

  return {
    order_id: order.id,
    payment_status: order.payment_status,
    order_status: order.status,
    transaction_id: order.transaction_id,
    paid_at: order.paid_at,
    payment_method: order.payment_method,
  };
};

module.exports = {
  getOrderById,
  checkOrderExists: checkOrderExists, // Sử dụng tên mới
  getPaymentStatus, // Xuất hàm mới
};
