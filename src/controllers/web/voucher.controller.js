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
    const customerId = req.user?.customerId; // lấy từ token/session
    if (!customerId) throwError("Unauthorized", 401);

    const { cartId, voucherCode } = req.body;
    if (!cartId || !voucherCode) throwError("Thiếu dữ liệu", 400);

    const result = await voucherService.applyVoucher(
      customerId,
      cartId,
      voucherCode
    );

    return success(res, 200, result);
  } catch (err) {
    console.log(err);
    return error(res, err.status || 400, err.message);
  }
};

module.exports = { getVouchers, applyVoucher };
