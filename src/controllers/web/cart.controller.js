const cartService = require("@/services/cart.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const customerId = req.user?.customerId || null;

    // Lấy thông tin thiết bị
    const userAgent = req.headers["user-agent"];
    const ipAddress = req.ip;

    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    const result = await cartService.addItem({
      customerId,
      sessionId,
      productId,
      variantId,
      quantity,
      userAgent,
      ipAddress,
    });

    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
};

const getCartItems = async (req, res) => {
  try {
    const customerId = req.user?.customerId || null;

    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    const result = await cartService.getCartItems({ customerId, sessionId });
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const customerId = req.user?.customerId;

    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    if (!quantity) {
      throwError(400, "Quantity is required");
    }

    const result = await cartService.updateCartItemQuantity(
      cartItemId,
      quantity,
      { customerId, sessionId }
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

    // Cho phép cả customer và guest
    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    const result = await cartService.removeCartItem(cartItemId, {
      customerId,
      sessionId,
    });

    if (!result.success) {
      throwError(400, result.error);
    }

    return success(res, 200, null, result.message);
  } catch (err) {
    console.log(err);
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const updateCartItemVariant = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { variantId } = req.body;
    const customerId = req.user?.customerId;

    // Validation cơ bản
    if (!itemId) {
      return error(res, 400, "Item ID is required");
    }

    if (!variantId) {
      return error(res, 400, "Variant ID is required");
    }

    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        return error(res, 401, "Session ID required for guest users");
      }
    }

    // Gọi service với cả customerId và sessionId
    const result = await cartService.updateCartItemVariant(itemId, variantId, {
      customerId,
      sessionId,
    });

    if (!result.success) {
      return error(res, 400, result.error);
    }

    return success(res, 200, {
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("Error in updateCartItemVariant controller:", err);

    // Xử lý lỗi từ throwError
    if (err.status) {
      return error(res, err.status, err.message, err.errors);
    }

    return error(res, 500, "Internal server error");
  }
};

module.exports = {
  getCartItems,
  addToCart,
  updateQuantity,
  removeCartItem,
  updateCartItemVariant,
};
