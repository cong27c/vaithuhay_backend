const {
  checkoutCustomerService,
  checkoutGuestService,
} = require("@/services/checkout.service");
exports.handleCheckout = async (req, res) => {
  try {
    const { cartItems, formData, paymentMethod, shippingFee, shippingInfo } =
      req.body;
    let result;

    const customerId = req.user?.customerId || null;
    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    if (customerId) {
      // Người dùng đã đăng nhập
      result = await checkoutCustomerService(
        customerId,
        cartItems,
        formData,
        paymentMethod,
        shippingFee,
        shippingInfo
      );
    } else if (sessionId) {
      // Người dùng là khách
      result = await checkoutGuestService(
        sessionId,
        cartItems,
        formData,
        paymentMethod,
        shippingFee,
        shippingInfo
      );
    } else {
      // Không có thông tin người dùng
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
