const voucherService = require("@/services/voucher.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const getVouchers = async (req, res) => {
  try {
    const result = await voucherService.getAllVouchers();
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const applyVoucher = async (req, res) => {
  try {
    const customerId = req.user?.customerId || null;
    const { voucherCode, cartItems } = req.body;

    let sessionId;
    if (!customerId) {
      sessionId = req.guestSession?.id;
      if (!sessionId) {
        throwError(401, "Session ID required for guest users");
      }
    }

    const result = await voucherService.applyVoucher(
      customerId,
      sessionId,
      voucherCode,
      cartItems
    );

    return success(res, 200, result);
  } catch (err) {
    console.log(err);
    return error(res, err.status || 400, err.message);
  }
};

module.exports = { getVouchers, applyVoucher };
