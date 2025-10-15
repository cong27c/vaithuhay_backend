const { Cart, CartItem, Product, ProductVariant } = require("@/models");
const throwError = require("@/utils/throwError");

const cartService = {
  async recalculateCartTotals(cartId) {
    const items = await CartItem.findAll({
      where: { cart_id: cartId },
      attributes: ["total_price", "discount_amount"],
    });

    const totalAmount = items.reduce(
      (sum, item) => sum + parseFloat(item.total_price || 0),
      0
    );
    const discountTotal = items.reduce(
      (sum, item) => sum + parseFloat(item.discount_amount || 0),
      0
    );
    const finalAmount = totalAmount - discountTotal;

    await Cart.update(
      { total_amount: totalAmount, final_amount: finalAmount },
      { where: { id: cartId } }
    );
  },
  async addItem({
    customerId,
    sessionId,
    productId,
    variantId,
    quantity = 1,
    userAgent,
    ipAddress,
  }) {
    try {
      // 1️⃣ Xác định điều kiện tìm giỏ hàng
      let whereClause = {};
      if (customerId) {
        whereClause = { customer_id: customerId, status: "active" };
      } else if (sessionId) {
        whereClause = { session_id: sessionId, status: "active" };
      } else {
        throwError("Missing both customer_id and session_id", 400);
      }

      // 2️⃣ Tìm hoặc tạo giỏ hàng
      let cart = await Cart.findOne({ where: whereClause });

      if (!cart) {
        cart = await Cart.create({
          customer_id: customerId || null,
          session_id: sessionId || null,
          total_amount: 0,
          discount_amount: 0,
          final_amount: 0,
          status: "active",
          user_agent: userAgent,
          ip_address: ipAddress,
          created_at: new Date(),
        });
      }

      // 3️⃣ Lấy giá sản phẩm
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

      // 4️⃣ Thêm hoặc cập nhật CartItem
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

      await this.recalculateCartTotals(cart.id);

      return { cart, cartItem };
    } catch (error) {
      console.error("Error in addItem:", error);
      throwError(500, "Failed to add item to cart");
    }
  },

  async getCartItems({ customerId, sessionId }) {
    try {
      // Validation
      let cart;

      if (customerId) {
        cart = await Cart.findOne({
          where: { customer_id: customerId, status: "active" },
        });
      } else if (sessionId) {
        cart = await Cart.findOne({
          where: { session_id: sessionId, status: "active" },
        });
      } else {
        throwError(400, "Missing customerId or sessionId");
      }

      if (!cart) {
        return { success: true, data: [], message: "Cart not found" };
      }
      const cartItems = await CartItem.findAll({
        where: { cart_id: cart.id },
        include: [
          {
            model: Product,
            attributes: ["id", "name", "slug"],
            required: true,
            as: "Product",
          },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url"],
            required: true,
            as: "ProductVariant",
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

  async updateCartItemQuantity(
    cartItemId,
    quantity,
    { customerId, sessionId }
  ) {
    try {
      // Validation
      if (!cartItemId || isNaN(cartItemId)) {
        return { success: false, error: "Invalid cart item ID" };
      }

      if (!quantity || quantity < 1) {
        return { success: false, error: "Quantity must be at least 1" };
      }

      // Tìm cart item dựa trên loại người dùng (customer hoặc guest)
      const whereCart = {};
      if (customerId) whereCart.customer_id = customerId;
      else if (sessionId) whereCart.session_id = sessionId;
      else return { success: false, error: "Missing user identifier" };
      console.log("sessionId", sessionId);
      const cartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        include: [
          {
            model: Cart,
            where: whereCart,
            attributes: ["id"],
            required: true,
            as: "Cart",
          },
          {
            model: ProductVariant,
            attributes: ["id", "price", "stock"],
            as: "ProductVariant",
            required: true,
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          error: "Cart item not found or not authorized",
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
            as: "Cart",
          },
        ],
      });

      // Recalculate cart totals
      await this.recalculateCartTotals(updatedCartItem.cart_id);

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

  async removeCartItem(cartItemId, { customerId, sessionId }) {
    try {
      // Validation
      if (!cartItemId || isNaN(cartItemId)) {
        return {
          success: false,
          error: "Invalid cart item ID",
        };
      }

      // Tìm cart item dựa trên loại người dùng (customer hoặc guest)
      const whereCart = {};
      if (customerId) whereCart.customer_id = parseInt(customerId);
      else if (sessionId) whereCart.session_id = sessionId;
      else return { success: false, error: "Missing user identifier" };

      const cartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        include: [
          {
            model: Cart,
            where: whereCart,
            attributes: ["id"],
            required: true,
            as: "Cart",
          },
        ],
      });
      console.log("cartItem", cartItem);

      if (!cartItem) {
        return {
          success: false,
          error: "Cart item not found or does not belong to user",
        };
      }

      const cartId = cartItem.cart_id;

      // Xóa cart item
      await CartItem.destroy({
        where: { id: parseInt(cartItemId) },
      });

      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);

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

  async updateCartItemVariant(itemId, variantId, { customerId, sessionId }) {
    try {
      // Validation
      if (!itemId || !variantId) {
        throwError(400, "Missing required parameters: itemId, variantId");
      }

      // Tìm cart dựa trên loại người dùng (customer hoặc guest)
      const whereCart = {};
      if (customerId) whereCart.customer_id = parseInt(customerId);
      else if (sessionId) whereCart.session_id = sessionId;
      else throwError(400, "Missing user identifier");

      const cart = await Cart.findOne({
        where: whereCart,
        attributes: ["id"],
      });

      if (!cart) {
        throwError(404, "Cart not found");
      }

      // Tìm cart item và kiểm tra quyền sở hữu
      const cartItem = await CartItem.findOne({
        where: {
          id: itemId,
          cart_id: cart.id,
        },
        include: [
          {
            model: Product,
            attributes: ["id", "name"],
            as: "Product",
          },
        ],
      });

      if (!cartItem) {
        throwError(404, "Cart item not found or does not belong to this user");
      }

      // Tìm variant mới và kiểm tra
      const newVariant = await ProductVariant.findOne({
        where: { id: variantId },
        include: [
          {
            model: Product,
            attributes: ["id", "name"],
            as: "Product",
          },
        ],
      });

      if (!newVariant) {
        throwError(404, "Variant not found");
      }

      // Kiểm tra xem variant có thuộc cùng product không
      if (cartItem.Product.id !== newVariant.Product.id) {
        throwError(400, "Cannot change to variant of different product");
      }

      // Kiểm tra tồn kho
      if (
        newVariant.stock_quantity !== null &&
        cartItem.quantity > newVariant.stock_quantity
      ) {
        throwError(
          400,
          `Quantity in cart (${cartItem.quantity}) exceeds available stock (${newVariant.stock_quantity})`
        );
      }

      // Tạo variantInfo từ variant name
      const productName = cartItem.Product.name;
      const variantFullName = newVariant.name;
      let variantInfo = variantFullName;

      // Xử lý để lấy phần variant name (loại bỏ product name)
      if (variantFullName.includes(productName)) {
        variantInfo = variantFullName.replace(productName, "").trim();
        // Loại bỏ dấu "-" thừa ở đầu nếu có
        if (variantInfo.startsWith("-")) {
          variantInfo = variantInfo.substring(1).trim();
        }
      }

      // Cập nhật cart item
      const [updateCount] = await CartItem.update(
        {
          variant_id: variantId,
          unit_price: newVariant.price,
          total_price: newVariant.price * cartItem.quantity,
          updated_at: new Date(),
        },
        {
          where: { id: itemId },
        }
      );

      if (updateCount === 0) {
        throwError(500, "Failed to update cart item");
      }

      // Lấy thông tin item đã cập nhật
      const finalItem = await CartItem.findOne({
        where: { id: itemId },
        include: [
          {
            model: Product,
            attributes: ["id", "name", "slug"],
            as: "Product",
          },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url"],
            as: "ProductVariant",
          },
        ],
      });

      if (!finalItem) {
        throwError(500, "Failed to retrieve updated cart item");
      }

      // Recalculate cart totals
      await this.recalculateCartTotals(cart.id);

      // Format response data
      const formattedItem = {
        id: finalItem.id,
        name: finalItem.Product.name,
        slug: finalItem.Product.slug,
        variant: variantInfo,
        price: parseFloat(finalItem.unit_price) || 0,
        quantity: finalItem.quantity || 0,
        image: finalItem.ProductVariant.image_url || "",
        variantId: finalItem.variant_id,
      };

      return {
        success: true,
        data: formattedItem,
        message: "Variant updated successfully",
      };
    } catch (err) {
      console.error("Error in updateCartItemVariant service:", err);

      // Nếu đã là throwError thì re-throw
      if (err.status) {
        throw err;
      }

      // Nếu là lỗi thông thường thì wrap thành throwError
      throwError(500, "Failed to update cart item variant", err.message);
    }
  },
};

module.exports = cartService;
