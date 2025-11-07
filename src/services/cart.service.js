const {
  Cart,
  CartItem,
  Product,
  ProductVariant,
  Combo,
  ComboProduct,
  ProductImage,
  ProductDiscount,
} = require("@/models");
const formatCurrency = require("@/utils/formatCurrency");
const throwError = require("@/utils/throwError");
const { Op } = require("sequelize");

const cartService = {
  async calculateComboPrice(comboId) {
    // Lấy combo cùng danh sách sản phẩm
    const combo = await Combo.findByPk(comboId, {
      include: {
        model: ComboProduct,
        as: "products",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price"],
            include: [
              {
                model: ProductDiscount,
                as: "discount",
                where: {
                  status: "active",
                  [Op.and]: [
                    { start_date: { [Op.lte]: new Date() } },
                    { end_date: { [Op.gte]: new Date() } },
                  ],
                },
                required: false,
              },
            ],
          },
        ],
      },
    });

    if (!combo) throw new Error("Combo not found");

    let totalPrice = 0;

    // ✅ Tính tổng giá sau khi áp dụng discount của từng product
    for (const cp of combo.products) {
      const product = cp.product;
      if (!product) continue;

      let productPrice = parseFloat(product.price || 0);
      const discount = product.discounts?.[0];

      if (discount) {
        if (discount.discount_type === "percent") {
          productPrice -= (productPrice * discount.discount_value) / 100;
        } else if (discount.discount_type === "fixed") {
          productPrice -= parseFloat(discount.discount_value);
        }
      }

      totalPrice += productPrice * (cp.quantity || 1);
    }

    // ✅ Áp dụng discount_value của combo (theo %)
    if (combo.discount_value) {
      totalPrice -= (totalPrice * combo.discount_value) / 100;
    }

    return totalPrice > 0 ? parseFloat(totalPrice.toFixed(2)) : 0;
  },

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

      // 4️⃣ Lấy thông tin giảm giá từ ProductDiscount
      let discountAmount = 0;

      const currentDate = new Date().toISOString().split("T")[0]; // Lấy ngày hiện tại dạng YYYY-MM-DD

      const productDiscount = await ProductDiscount.findOne({
        where: {
          product_id: productId,
          discount_type: "percent",
          status: "active",
          start_date: { [Op.lte]: currentDate }, // Ngày bắt đầu <= hiện tại
          end_date: { [Op.gte]: currentDate }, // Ngày kết thúc >= hiện tại
        },
        order: [["discount_value", "DESC"]], // Ưu tiên giảm giá cao nhất nếu có nhiều
      });

      discountAmount = productDiscount.discount_value;

      // 5️⃣ Thêm hoặc cập nhật CartItem
      const cartItemWhere = {
        cart_id: cart.id,
        product_id: productId,
      };

      if (variantId) {
        cartItemWhere.variant_id = variantId;
      } else {
        cartItemWhere.variant_id = null;
      }

      let cartItem = await CartItem.findOne({
        where: cartItemWhere,
      });

      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.discount_amount = discountAmount;
        cartItem.total_price = (unitPrice - discountAmount) * cartItem.quantity;
        await cartItem.save();
      } else {
        cartItem = await CartItem.create({
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId || null,
          quantity,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          total_price: (unitPrice - discountAmount) * quantity,
        });
      }

      await this.recalculateCartTotals(cart.id);

      return {
        cart,
        cartItem,
      };
    } catch (error) {
      console.log("Error in addItem:", error);
      throwError("Failed to add item to cart", 500);
    }
  },
  async getCartItems({ customerId, sessionId }) {
    try {
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
            attributes: ["id", "name", "slug", "weight"],
            required: true,
            as: "Product",
          },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url", "price"],
            required: false,
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

      if (!cartItems || cartItems.length === 0) {
        return { success: true, data: [], message: "Cart is empty" };
      }

      // --- xử lý logic ảnh chính nếu không có variant ---
      const formattedItems = await Promise.all(
        cartItems?.map(async (item) => {
          const productName = item.Product?.name || "N/A";
          const variantFullName = item.ProductVariant?.name || "N/A";

          // Lấy tên biến thể (bỏ tên sản phẩm)
          let variantName = variantFullName;
          if (variantFullName.includes(productName)) {
            variantName = variantFullName.replace(productName, "").trim();
            if (variantName.startsWith("-")) {
              variantName = variantName.substring(1).trim();
            }
          }

          // --- logic ảnh ---
          let image = item.ProductVariant?.image_url || "";

          // Nếu không có variant hoặc không có ảnh → lấy ảnh chính của sản phẩm
          if (!image && item.Product?.id) {
            const mainImage = await ProductImage.findOne({
              where: {
                product_id: item.Product.id,
                is_main: true,
              },
            });
            if (mainImage) {
              image = mainImage.image_url;
            }
          }

          // --- Tính toán giá ---
          const discountPercentage = parseFloat(item.discount_amount) || 0;

          // Giá gốc: lấy từ variant price hoặc unit_price
          let originalPrice =
            parseFloat(item.ProductVariant?.price) ||
            parseFloat(item.unit_price) ||
            0;

          // Nếu có discount, tính giá sau discount
          let price = originalPrice;
          if (discountPercentage > 0) {
            price = originalPrice * (1 - discountPercentage / 100);
          }

          return {
            id: item.id,
            productId: item.Product?.id,
            name: productName,
            slug: item.Product?.slug,
            weight: item.Product?.weight,
            variant: variantName,
            originalPrice: Math.round(originalPrice), // Giá gốc
            price: Math.round(price), // Giá sau discount
            quantity: item.quantity || 0,
            image, // luôn có giá trị
            checked: false,
            discount: discountPercentage,
          };
        })
      );

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
            required: false,
          },
          {
            model: Product, // Thêm include Product để lấy giá từ product nếu không có variant
            attributes: ["id", "price"],
            as: "Product",
            required: false,
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          error: "Cart item not found or not authorized",
        };
      }

      // Xác định giá và stock
      let unitPrice = 0;
      let availableStock = null;

      if (cartItem.ProductVariant) {
        // Nếu có ProductVariant, lấy giá và stock từ variant
        unitPrice = parseFloat(cartItem.ProductVariant.price);
        availableStock = cartItem.ProductVariant.stock;
      } else if (cartItem.Product) {
        // Nếu không có variant nhưng có Product, lấy giá từ product
        unitPrice = parseFloat(cartItem.Product.price);
        // Stock từ product hoặc có thể là null tùy logic của bạn
        availableStock = cartItem.Product.stock || null;
      } else {
        // Nếu không có cả variant và product
        return {
          success: false,
          error: "Product information not found for this cart item",
        };
      }

      // Kiểm tra số lượng tồn kho nếu có thông tin stock
      if (availableStock !== null && quantity > availableStock) {
        return {
          success: false,
          error: `Only ${availableStock} items available in stock`,
        };
      }

      // Tính toán lại giá
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
      console.log("Error in updateCartItemQuantity service:", error);
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

  ///// COMBOS
  async addCombo({
    customerId,
    sessionId,
    comboId,
    quantity = 1,
    userAgent,
    ipAddress,
  }) {
    try {
      // 1️⃣ Xác định cart hiện tại
      let whereClause = {};
      if (customerId)
        whereClause = { customer_id: customerId, status: "active" };
      else if (sessionId)
        whereClause = { session_id: sessionId, status: "active" };
      else throw new Error("Missing both customer_id and session_id");

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

      // 2️⃣ Tính giá combo (unitPrice)
      const unitPrice = await this.calculateComboPrice(comboId);

      // 3️⃣ Tìm cart item combo hiện tại
      let cartItem = await CartItem.findOne({
        where: { cart_id: cart.id, combo_id: comboId },
      });

      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.total_price = cartItem.quantity * unitPrice;
        await cartItem.save();
      } else {
        cartItem = await CartItem.create({
          cart_id: cart.id,
          combo_id: comboId,
          quantity,
          unit_price: unitPrice,
          discount_amount: 0,
          total_price: unitPrice * quantity,
        });
      }

      // 4️⃣ Cập nhật tổng cart
      await this.recalculateCartTotals(cart.id);

      return {
        success: true,
        data: cartItem,
        message: "Combo added to cart",
      };
    } catch (error) {
      console.error("Error in addCombo:", error);
      return { success: false, error: "Failed to add combo to cart" };
    }
  },

  async getCartCombos({ customerId, sessionId }) {
    try {
      // 1️⃣ Tìm giỏ hàng đang hoạt động
      let cart;
      if (customerId)
        cart = await Cart.findOne({
          where: { customer_id: customerId, status: "active" },
        });
      else if (sessionId)
        cart = await Cart.findOne({
          where: { session_id: sessionId, status: "active" },
        });
      else throwError(400, "Missing customerId or sessionId");

      if (!cart) return { success: true, data: [], message: "Cart not found" };

      // 2️⃣ Lấy combo items kèm ảnh sản phẩm
      const comboItems = await CartItem.findAll({
        where: { cart_id: cart.id, combo_id: { [Op.ne]: null } },
        attributes: ["id", "quantity"],
        include: [
          {
            model: Combo,
            as: "Combo",
            attributes: ["id", "name", "discount_value"],
            include: [
              {
                model: ComboProduct,
                as: "products",
                include: [
                  {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "price", "weight"],
                    include: [
                      {
                        model: ProductImage,
                        as: "images",
                        attributes: ["image_url", "is_main"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // 3️⃣ Format dữ liệu trả về
      const formatted = comboItems
        ?.map((item) => {
          const combo = item.Combo;
          if (!combo) return null;

          const products =
            combo.products?.map((cp) => {
              const product = cp.product;

              // 🔹 Chọn ảnh: ưu tiên is_main, nếu không có thì lấy bừa ảnh đầu
              let image = null;
              if (product?.images?.length > 0) {
                const mainImage = product.images.find((img) => img.is_main);
                image = mainImage?.image_url || product.images[0].image_url;
              }

              const price = parseFloat(product?.price) || 0;
              const productQuantity = cp.quantity || 1;

              return {
                id: product?.id,
                name: product?.name,
                price,
                weight: product?.weight,
                image,
                quantity: productQuantity,
                subtotal: price * productQuantity,
              };
            }) || [];

          const totalPrice = products.reduce((sum, p) => sum + p.subtotal, 0);
          const discountValue = combo.discount_value || 0;
          const discountPrice = totalPrice * (1 - discountValue / 100);

          const unitPrice = parseFloat(item.unit_price) || discountPrice;
          const itemTotal =
            parseFloat(item.total_price) || unitPrice * item.quantity;

          return {
            id: item.id,
            comboId: combo.id,
            name: combo.name,
            price: unitPrice,
            quantity: item.quantity, // Quantity từ CartItem
            total: itemTotal,

            totalPrice,
            originalTotal: totalPrice * item.quantity,
            discountedTotal: discountPrice * item.quantity,
            discountValue,

            products,
          };
        })
        .filter(Boolean);

      return { success: true, data: formatted };
    } catch (error) {
      console.error("❌ Error in getCartCombos:", error);
      return { success: false, error: "Failed to get cart combos" };
    }
  },

  async updateCartComboQuantity(
    cartItemId,
    quantity,
    { customerId, sessionId }
  ) {
    try {
      if (!cartItemId || isNaN(cartItemId))
        return { success: false, error: "Invalid combo item ID" };
      if (!quantity || quantity < 1)
        return { success: false, error: "Quantity must be at least 1" };

      const whereCart = {};
      if (customerId) whereCart.customer_id = customerId;
      else if (sessionId) whereCart.session_id = sessionId;
      else return { success: false, error: "Missing user identifier" };

      const cartItem = await CartItem.findOne({
        where: { id: parseInt(cartItemId) },
        attributes: ["id", "quantity", "unit_price", "cart_id"],
        include: [
          { model: Cart, where: whereCart, as: "Cart", attributes: ["id"] },
          {
            model: Combo,
            as: "Combo",
            attributes: ["id"],
          },
        ],
      });

      if (!cartItem)
        return { success: false, error: "Combo cart item not found" };
      const unitPrice = cartItem.unit_price || 0;
      const totalPrice = unitPrice * quantity;

      await cartItem.update({ quantity, total_price: totalPrice });

      await this.recalculateCartTotals(cartItem.cart_id);

      return { success: true, message: "Combo quantity updated" };
    } catch (error) {
      console.error("Error in updateCartComboQuantity:", error);
      return { success: false, error: "Failed to update combo quantity" };
    }
  },

  async removeCartCombo(cartItemId, { customerId, sessionId }) {
    try {
      if (!cartItemId || isNaN(cartItemId))
        return { success: false, error: "Invalid combo item ID" };

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

      if (!cartItem)
        return {
          success: false,
          error: "Combo item not found or unauthorized",
        };

      const cartId = cartItem.cart_id;

      await CartItem.destroy({ where: { id: parseInt(cartItemId) } });

      await this.recalculateCartTotals(cartId);

      return { success: true, message: "Combo removed successfully" };
    } catch (error) {
      console.error("Error in removeCartCombo:", error);
      return { success: false, error: "Failed to remove combo" };
    }
  },
};

module.exports = cartService;
