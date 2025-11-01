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
        // Lấy trực tiếp từ các cột riêng biệt
        const condition_type = cond.condition_type;
        const operator = cond.operator;
        let value = cond.condition_value;

        console.log("Raw condition:", { condition_type, operator, value });

        // Parse value từ string sang đúng kiểu dữ liệu
        if (value) {
          try {
            // Thử parse JSON nếu value là array/object string
            if (value.startsWith("[") || value.startsWith("{")) {
              value = JSON.parse(value);
            }
            // Parse số
            else if (!isNaN(value)) {
              value = parseFloat(value);
            }
            // Parse boolean
            else if (value === "true" || value === "false") {
              value = value === "true";
            }
          } catch (error) {
            console.log("Parse value error, using raw value:", value);
          }
        }

        console.log("Parsed condition:", { condition_type, operator, value });

        if (!condition_type) {
          console.warn("Missing condition_type for condition:", cond.id);
          continue;
        }

        // Xử lý các loại condition
        switch (condition_type) {
          case "min_order_value": {
            const subtotal = cartItems.reduce(
              (sum, item) =>
                sum + (item.unit_price || 0) * (item.quantity || 0),
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
            // value là mảng product_ids [7,8,9]
            const productIds = Array.isArray(value) ? value : [value];
            const hasProduct = cartItems.some((item) =>
              productIds.includes(item.product_id)
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
            // value là mảng collection_ids [11]
            const collectionIds = Array.isArray(value) ? value : [value];

            // Kiểm tra từng sản phẩm trong giỏ hàng
            const hasCollection = cartItems.some((item) => {
              if (!item.Product || !item.Product?.collections) return false;

              return item.Product.collections.some((collection) =>
                collectionIds.includes(collection.id)
              );
            });

            console.log(
              `Collection check: looking for ${collectionIds}, found: ${hasCollection}`
            );

            if (!hasCollection) {
              throw new Error(
                "Không có sản phẩm nào trong giỏ hàng thuộc collection yêu cầu"
              );
            }
            break;
          }

          case "first_order": {
            if (operator === "=" && value === true) {
              const previousOrders = await Order.count({
                where: { customer_id: customerId },
              });
              console.log(
                `First order check: previous orders = ${previousOrders}`
              );

              if (previousOrders > 0)
                throw new Error("Mã chỉ áp dụng cho đơn hàng đầu tiên");
            }
            break;
          }

          case "time_frame": {
            // value là object {start: "20:00", end: "22:00"}
            let timeData = value;
            if (typeof value === "string") {
              try {
                // Sửa lỗi JSON string (dấu " thay vì ')
                const fixedJson = value.replace(/'/g, '"');
                timeData = JSON.parse(fixedJson);
              } catch (error) {
                console.log("Parse time_frame error:", error);
              }
            }

            if (timeData && timeData.start && timeData.end) {
              const now = new Date();
              const currentTime = now.getHours() + ":" + now.getMinutes();
              console.log(
                `Time frame check: current=${currentTime}, allowed=${timeData.start}-${timeData.end}`
              );

              if (currentTime < timeData.start || currentTime > timeData.end) {
                throw new Error(
                  `Mã chỉ áp dụng từ ${timeData.start} đến ${timeData.end}`
                );
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

  async applyVoucher(customerId, sessionId, voucherCode) {
    try {
      console.log("customerId", customerId);
      console.log("sessionId", sessionId);
      console.log("voucherCode", voucherCode);

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

      // 2. Lấy giỏ hàng dựa trên customerId hoặc sessionId
      let cart;
      if (customerId) {
        cart = await Cart.findOne({
          where: { customer_id: customerId, status: "active" },
          include: [
            {
              model: CartItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "Product",
                  include: [
                    {
                      model: Collection,
                      as: "collections",
                      through: { attributes: [] },
                    },
                  ],
                },
              ],
            },
          ],
        });
      } else if (sessionId) {
        cart = await Cart.findOne({
          where: { session_id: sessionId, status: "active" },
          include: [
            {
              model: CartItem,
              as: "items",
              include: [
                {
                  model: Product,
                  as: "Product",
                  include: [
                    {
                      model: Collection,
                      as: "collections",
                      through: { attributes: [] },
                    },
                  ],
                },
              ],
            },
          ],
        });
      } else {
        return {
          success: false,
          message: "Không tìm thấy giỏ hàng: cần customerId hoặc sessionId",
        };
      }

      if (!cart || !cart.items.length) {
        return {
          success: false,
          message: "Giỏ hàng trống",
        };
      }

      // 3. Kiểm tra điều kiện voucher
      await this.checkVoucherConditions(voucher, customerId, cart.items);

      // 4. Tính subtotal
      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
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
    return vouchers.map((v) => {
      return {
        ...v.toJSON(),
      };
    });
  },
};

module.exports = voucherService;
