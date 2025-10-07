const { Cart, CartItem, Product, ProductVariant } = require("@/models");
const throwError = require("@/utils/throwError");

const cartService = {
  async addItem(customerId, productId, variantId, quantity = 1) {
    try {
      // 1. Tìm giỏ hàng
      let cart = await Cart.findOne({
        where: { customer_id: customerId, status: "active" },
      });

      if (!cart) {
        cart = await Cart.create({
          customer_id: customerId,
          total_amount: 0,
          discount_amount: 0,
          final_amount: 0,
          status: "active",
        });
      }

      // 2. Lấy giá sản phẩm
      let unitPrice = 0;
      if (variantId) {
        const variant = await ProductVariant.findByPk(variantId);
        if (!variant) throwError("Variant not found", 404);
        unitPrice = variant.price;
      } else {
        const product = await Product.findByPk(productId);
        if (!product) throwError("Product not found", 404);
        unitPrice = product.price;
      }

      // 3. Thêm hoặc cập nhật CartItem
      let cartItem = await CartItem.findOne({
        where: {
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId,
        },
      });

      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.total_price = cartItem.quantity * unitPrice;
        await cartItem.save();
      } else {
        cartItem = await CartItem.create({
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId,
          quantity,
          unit_price: unitPrice,
          discount_amount: 0,
          total_price: unitPrice * quantity,
        });
      }

      // 4. Update tổng tiền
      const items = await CartItem.findAll({ where: { cart_id: cart.id } });
      const totalAmount = items.reduce(
        (sum, i) => sum + Number(i.total_price),
        0
      );

      cart.total_amount = totalAmount;
      cart.final_amount = totalAmount - cart.discount_amount;
      await cart.save();

      return { cart, cartItem };
    } catch (error) {
      console.log(error);
    }
  },

  async getCartItems(customerId) {
    try {
      // Validation
      if (!customerId || isNaN(customerId)) {
        return {
          success: false,
          error: "Invalid customer ID",
        };
      }

      // Lấy cart_id từ customer_id
      const cart = await Cart.findOne({
        where: { customer_id: parseInt(customerId) },
        attributes: ["id"],
      });

      if (!cart) {
        return {
          success: true,
          data: [],
          message: "Cart not found for this customer",
        };
      }

      const cartItems = await CartItem.findAll({
        where: { cart_id: cart.id },
        include: [
          {
            model: Product,
            attributes: ["id", "name", "slug"],
            required: true,
          },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url"],
            required: true,
          },
        ],
        attributes: [
          "id",
          "quantity",
          "unit_price",
          "discount_amount",
          "total_price",
        ],
        order: [["created_at", "DESC"]],
      });

      // Nếu không có items
      if (!cartItems || cartItems.length === 0) {
        return {
          success: true,
          data: [],
          message: "Cart is empty",
        };
      }

      // Format data với xử lý variant name
      const formattedItems = cartItems.map((item) => {
        const productName = item.Product?.name || "N/A";
        const variantFullName = item.ProductVariant?.name || "N/A";

        // Xử lý để lấy phần variant name (loại bỏ product name)
        let variantName = variantFullName;
        if (variantFullName.includes(productName)) {
          variantName = variantFullName.replace(productName, "").trim();
          // Loại bỏ dấu "-" thừa ở đầu nếu có
          if (variantName.startsWith("-")) {
            variantName = variantName.substring(1).trim();
          }
        }

        return {
          id: item.id,
          name: productName,
          slug: item.Product?.slug,
          variant: variantName,
          price: parseFloat(item.unit_price) || 0,
          quantity: item.quantity || 0,
          image: item.ProductVariant?.image_url || "",
          checked: false,
        };
      });

      return {
        success: true,
        data: formattedItems,
        totalItems: formattedItems.length,
      };
    } catch (error) {
      console.error("Error in getCartItems service:", error);
      return {
        success: false,
        error: "Failed to retrieve cart items",
        debug:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      };
    }
  },

  async updateCartItemQuantity(cartItemId, quantity, customerId) {
    try {
      // Validation
      if (!cartItemId || isNaN(cartItemId)) {
        return {
          success: false,
          error: "Invalid cart item ID",
        };
      }

      if (!quantity || quantity < 1) {
        return {
          success: false,
          error: "Quantity must be at least 1",
        };
      }

      if (!customerId || isNaN(customerId)) {
        return {
          success: false,
          error: "Invalid customer ID",
        };
      }

      const cartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        include: [
          {
            model: Cart,
            where: { customer_id: parseInt(customerId) },
            attributes: ["id"],
            required: true,
          },
          {
            model: ProductVariant,
            attributes: ["id", "price", "stock"],
            required: true,
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          error: "Cart item not found or does not belong to customer",
        };
      }

      // Kiểm tra số lượng tồn kho
      if (quantity > cartItem.ProductVariant.stock) {
        return {
          success: false,
          error: `Only ${cartItem.ProductVariant.stock} items available in stock`,
        };
      }

      // Tính toán lại giá
      const unitPrice = parseFloat(cartItem.ProductVariant.price);
      const discountAmount = parseFloat(cartItem.discount_amount) || 0;
      const totalPrice = unitPrice * quantity - discountAmount;

      // Update cart item
      await CartItem.update(
        {
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice > 0 ? totalPrice : 0,
        },
        {
          where: { id: parseInt(cartItemId) },
        }
      );

      // Lấy thông tin cart item đã update
      const updatedCartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        include: [
          {
            model: Cart,
            attributes: ["id"],
            required: true,
          },
        ],
      });

      return {
        success: true,
        data: updatedCartItem,
        message: "Cart item quantity updated successfully",
      };
    } catch (error) {
      console.error("Error in updateCartItemQuantity service:", error);
      return {
        success: false,
        error: "Failed to update cart item quantity",
      };
    }
  },

  async removeCartItem(cartItemId, customerId) {
    try {
      // Validation
      if (!cartItemId || isNaN(cartItemId)) {
        return {
          success: false,
          error: "Invalid cart item ID",
        };
      }

      if (!customerId || isNaN(customerId)) {
        return {
          success: false,
          error: "Invalid customer ID",
        };
      }

      // Tìm cart item và verify nó thuộc về customer
      const cartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        include: [
          {
            model: Cart,
            where: { customer_id: parseInt(customerId) },
            attributes: ["id"],
            required: true,
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          error: "Cart item not found or does not belong to customer",
        };
      }

      // Xóa cart item
      await CartItem.destroy({
        where: { id: parseInt(cartItemId) },
      });

      return {
        success: true,
        message: "Cart item removed successfully",
      };
    } catch (error) {
      console.error("Error in removeCartItem service:", error);
      return {
        success: false,
        error: "Failed to remove cart item",
        debug:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      };
    }
  },
};

module.exports = cartService;
