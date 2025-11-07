const {
  Voucher,
  VoucherCondition,
  VoucherUsage,
  Cart,
  CartItem,
  Order,
  Product,
  Collection,
} = require("@/models");
const { Op } = require("sequelize");

const voucherService = {
  async checkVoucherConditions(voucher, customerId, cartItems) {
    if (!voucher.conditions || !Array.isArray(voucher.conditions)) {
      return true;
    }

    try {
      for (const cond of voucher.conditions) {
        const condition_type = cond.condition_type;
        const operator = cond.operator;
        let value = cond.condition_value; // Sequelize đã tự động parse JSON

        console.log("Condition:", { condition_type, operator, value });

        if (!condition_type) {
          console.warn("Missing condition_type for condition:", cond.id);
          continue;
        }

        // Xử lý các loại condition
        switch (condition_type) {
          case "min_order_value": {
            const subtotal = cartItems.reduce(
              (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
              0
            );
            console.log(`Min order check: ${subtotal} ${operator} ${value}`);

            if (operator === ">=" && subtotal < value) {
              throw new Error(
                `Đơn hàng cần tối thiểu ${value.toLocaleString()}đ để dùng mã`
              );
            }
            break;
          }

          case "product": {
            // value đã được parse thành mảng [101,102,103]
            const productIds = Array.isArray(value) ? value : [value];
            const hasProduct = cartItems.some((item) =>
              productIds.includes(item.product_id || item.id)
            );
            console.log(
              `Product check: looking for ${productIds}, found: ${hasProduct}`
            );

            if (
              (operator === "in" && !hasProduct) ||
              (operator === "not_in" && hasProduct)
            ) {
              throw new Error(`Mã chỉ áp dụng cho sản phẩm cụ thể`);
            }
            break;
          }

          case "collection": {
            // value có thể là mảng hoặc số lẻ
            const collectionIds = Array.isArray(value) ? value : [value];

            // Lấy danh sách slug từ giỏ hàng
            const cartProductSlug = cartItems.map((item) => item.slug);

            if (cartProductSlug.length === 0) {
              throw new Error(
                "Không có sản phẩm nào trong giỏ hàng thuộc collection yêu cầu"
              );
            }

            // Lấy danh sách sản phẩm trong collection tương ứng
            const productsInCollections = await Product.findAll({
              where: { slug: cartProductSlug },
              include: [
                {
                  model: Collection,
                  as: "collections",
                  through: { attributes: [] },
                  where: { id: collectionIds },
                },
              ],
            });

            console.log(
              `Collection check: found ${productsInCollections.length} products in collections ${collectionIds}`
            );

            // 🧩 Kiểm tra: tất cả sản phẩm trong giỏ đều thuộc collection
            if (productsInCollections.length !== cartProductSlug.length) {
              throw new Error(
                "Một hoặc nhiều sản phẩm trong giỏ hàng không thuộc collection yêu cầu"
              );
            }

            break;
          }

          case "first_order": {
            if (operator === "=" && value === true) {
              if (customerId) {
                const { Order } = require("../models"); // Import model Order
                const previousOrders = await Order.count({
                  where: { customer_id: customerId },
                });
                console.log(
                  `First order check: previous orders = ${previousOrders}`
                );

                if (previousOrders > 0)
                  throw new Error("Mã chỉ áp dụng cho đơn hàng đầu tiên");
              } else {
                throw new Error(
                  "Mã chỉ áp dụng cho đơn hàng đầu tiên - vui lòng đăng nhập"
                );
              }
            }
            break;
          }

          case "time_frame": {
            // value đã được parse thành object {start: "20:00", end: "22:00"}
            if (value && value.start && value.end) {
              const now = new Date();
              const currentHours = now.getHours().toString().padStart(2, "0");
              const currentMinutes = now
                .getMinutes()
                .toString()
                .padStart(2, "0");
              const currentTime = `${currentHours}:${currentMinutes}`;

              console.log(
                `Time frame check: current=${currentTime}, allowed=${value.start}-${value.end}`
              );

              if (currentTime < value.start || currentTime > value.end) {
                throw new Error(
                  `Mã chỉ áp dụng từ ${value.start} đến ${value.end}`
                );
              }
            }
            break;
          }

          case "category": {
            // Xử lý condition category tương tự collection
            const categoryIds = Array.isArray(value) ? value : [value];
            const cartProductIds = cartItems.map(
              (item) => item.product_id || item.id
            );

            if (cartProductIds.length === 0) {
              throw new Error(
                "Không có sản phẩm nào trong giỏ hàng thuộc danh mục yêu cầu"
              );
            }

            const { Product, Category } = require("../models");

            const productsInCategories = await Product.findAll({
              where: { id: cartProductIds },
              include: [
                {
                  model: Category,
                  as: "categories",
                  through: { attributes: [] },
                  where: { id: categoryIds },
                },
              ],
            });

            console.log(
              `Category check: found ${productsInCategories.length} products in categories ${categoryIds}`
            );

            if (productsInCategories.length === 0) {
              throw new Error(
                "Không có sản phẩm nào trong giỏ hàng thuộc danh mục yêu cầu"
              );
            }
            break;
          }

          case "user_group": {
            if (customerId) {
              const { Customer } = require("../models");
              const customer = await Customer.findByPk(customerId);
              const userGroups = Array.isArray(value) ? value : [value];

              if (customer && !userGroups.includes(customer.user_group)) {
                throw new Error("Mã không áp dụng cho nhóm khách hàng của bạn");
              }
            }
            break;
          }

          default:
            console.warn(`Unknown condition type: ${condition_type}`);
        }
      }
    } catch (error) {
      console.error("Error in checkVoucherConditions:", error);
      throw error;
    }
  },

  async applyVoucher(customerId, sessionId, voucherCode, cartItems) {
    try {
      console.log("customerId", customerId);
      console.log("sessionId", sessionId);
      console.log("voucherCode", voucherCode);
      console.log("cartItems", cartItems);

      // 1. Lấy voucher
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() },
          status: "active",
        },
        include: [{ model: VoucherCondition, as: "conditions" }],
      });

      if (!voucher) {
        return {
          success: false,
          message: "Voucher không hợp lệ hoặc đã hết hạn",
        };
      }

      // 2. Kiểm tra giỏ hàng
      if (!cartItems || !cartItems.length) {
        return {
          success: false,
          message: "Giỏ hàng trống",
        };
      }

      // 3. Kiểm tra điều kiện voucher
      await this.checkVoucherConditions(voucher, customerId, cartItems);

      // 4. Tính subtotal từ cartItems
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // 5. Tính discount
      let discount = 0;
      if (voucher.voucher_type === "percent") {
        discount = (subtotal * voucher.voucher_value) / 100;
      } else {
        discount = voucher.voucher_value;
      }
      discount = Math.min(discount, subtotal);

      // 6. Trả dữ liệu thành công
      return {
        success: true,
        data: {
          subtotal,
          discount,
          finalTotal: subtotal - discount,
          voucher_id: voucher.id,
          voucher_code: voucher.code,
        },
      };
    } catch (error) {
      console.error("Error in applyVoucher:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  async getAllVouchers() {
    const vouchers = await Voucher.findAll();

    // Chuẩn hoá description thành mảng
    return vouchers?.map((v) => {
      return {
        ...v.toJSON(),
      };
    });
  },
};

module.exports = voucherService;
