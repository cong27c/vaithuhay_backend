const voucherConditionService = require("@/services/voucherCondition.service");
const { success, error } = require("@/utils/response");

class VoucherConditionController {
  // CREATE condition
  async createCondition(req, res) {
    try {
      const { voucherId } = req.params;
      const result = await voucherConditionService.createCondition(
        voucherId,
        req.body
      );
      return success(res, 201, result, "Thêm điều kiện thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // GET all conditions for voucher
  async getVoucherConditions(req, res) {
    try {
      const { voucherId } = req.params;
      const result = await voucherConditionService.getVoucherConditions(
        voucherId
      );
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // UPDATE condition
  async updateCondition(req, res) {
    try {
      const { conditionId } = req.params;
      const result = await voucherConditionService.updateCondition(
        conditionId,
        req.body
      );
      return success(res, 200, result, "Cập nhật điều kiện thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // DELETE condition
  async deleteCondition(req, res) {
    try {
      const { conditionId } = req.params;
      const result = await voucherConditionService.deleteCondition(conditionId);
      return success(res, 200, result);
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }

  // BULK update conditions
  async bulkUpdateConditions(req, res) {
    try {
      const { voucherId } = req.params;
      const { conditions } = req.body;
      const result = await voucherConditionService.bulkUpdateConditions(
        voucherId,
        conditions
      );
      return success(res, 200, result, "Cập nhật điều kiện thành công");
    } catch (err) {
      return error(res, err.status || 500, err.message, err.errors);
    }
  }
}

module.exports = new VoucherConditionController();
