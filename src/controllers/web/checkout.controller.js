const {
  checkoutCustomerService,
  checkoutGuestService,
} = require("@/services/checkout.service");

exports.handleCheckout = async (req, res) => {
  try {
    const { isGuest, cartItems, formData, paymentMethod } = req.body;
    let result;

    if (isGuest) {
      result = await checkoutGuestService(
        req.guestSession?.id,
        cartItems,
        formData,
        paymentMethod
      );
    } else {
      result = await checkoutCustomerService(
        req.user.id,
        cartItems,
        formData,
        paymentMethod
      );
    }

    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
