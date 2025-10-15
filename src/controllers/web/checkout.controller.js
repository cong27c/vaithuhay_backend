// controllers/checkoutController.js
const checkoutService = require("@/services/checkout.service"); // Sửa import
const throwError = require("@/utils/throwError");

exports.checkout = async (req, res) => {
  try {
    const customerId = req.user?.customerId || null;
    const { session_id, ...formData } = req.body; // Sửa syntax

    let sessionId;
    if (!customerId) {
      sessionId = session_id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    const result = await checkoutService.handleCheckout({
      user: req.user, // Truyền cả user object
      customerId, // Truyền customerId riêng
      sessionId,
      formData,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      message: "Checkout completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};
