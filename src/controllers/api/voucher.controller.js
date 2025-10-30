const voucherService = require("@/services/voucherApi.service");
const { success, error } = require("@/utils/response");

class VoucherController {
  // CREATE voucher
  async createVoucher(req, res) {
    try {
      const result = await voucherService.createVoucher(req.body);
      return success(res, 201, result, "Tạo voucher thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // GET all vouchers
  async getAllVouchers(req, res) {
    try {
      const { page, limit, search } = req.query;
      const result = await voucherService.getAllVouchers({
        page,
        limit,
        search,
      });
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // GET voucher by ID
  async getVoucherById(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.getVoucherById(id);
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // GET voucher by code
  async getVoucherByCode(req, res) {
    try {
      const { code } = req.params;
      const result = await voucherService.getVoucherByCode(code);
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // UPDATE voucher
  async updateVoucher(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.updateVoucher(id, req.body);
      return success(res, 200, result, "Cập nhật voucher thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // DELETE voucher
  async deleteVoucher(req, res) {
    try {
      const { id } = req.params;
      const result = await voucherService.deleteVoucher(id);
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // UPDATE voucher status
  async updateVoucherStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await voucherService.updateVoucherStatus(id, status);
      return success(res, 200, result, "Cập nhật trạng thái thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // VALIDATE voucher
  async validateVoucher(req, res) {
    try {
      const { code } = req.params;
      const { user_id, order_data } = req.body;

      const result = await voucherService.validateVoucher(
        code,
        user_id,
        order_data
      );
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }
}

module.exports = new VoucherController();
