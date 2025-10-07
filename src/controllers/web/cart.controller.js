const cartService = require("@/services/cart.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const customerId = req.user?.customerId; // lấy từ token/session
    if (!customerId) {
      throwError("Unauthorized", 401);
    }

    const result = await cartService.addItem(
      customerId,
      productId,
      variantId,
      quantity
    );

    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const getCartItems = async (req, res) => {
  try {
    const customerId = req.user?.customerId;

    if (!customerId) {
      throwError(401, "Unauthorized - Customer ID not found");
    }

    const result = await cartService.getCartItems(customerId);

    if (!result.success) {
      throwError(400, result.error);
    }

    // Tuỳ thuộc vào cấu trúc hàm success thực tế
    return success(res, 200, {
      data: result.data,
      message: result.message,
      totalItems: result.totalItems,
    });
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const customerId = req.user?.customerId;

    if (!customerId) {
      throwError(401, "Unauthorized - Customer ID not found");
    }

    if (!quantity) {
      throwError(400, "Quantity is required");
    }

    const result = await cartService.updateCartItemQuantity(
      cartItemId,
      quantity,
      customerId
    );

    if (!result.success) {
      throwError(400, result.error);
    }

    return success(res, 200, result.data, result.message);
  } catch (err) {
    console.log(err);
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const customerId = req.user?.customerId;

    if (!customerId) {
      throwError(401, "Unauthorized - Customer ID not found");
    }

    const result = await cartService.removeCartItem(cartItemId, customerId);

    if (!result.success) {
      throwError(400, result.error);
    }

    return success(res, 200, null, result.message);
  } catch (err) {
    console.log(err);
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getCartItems,
  addToCart,
  updateQuantity,
  removeCartItem,
};
