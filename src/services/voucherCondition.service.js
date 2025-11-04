const { VoucherCondition, Voucher } = require("@/models");
const throwError = require("@/utils/throwError");

class VoucherConditionService {
  // CREATE condition for voucher
  async createCondition(voucherId, conditionData) {
    const voucher = await Voucher.findByPk(voucherId);
    if (!voucher) {
      throw throwError(404, "Voucher không tồn tại");
    }

    const condition = await VoucherCondition.create({
      ...conditionData,
      voucher_id: voucherId,
    });

    return condition;
  }

  // GET all conditions for voucher
  async getVoucherConditions(voucherId) {
    const conditions = await VoucherCondition.findAll({
      where: { voucher_id: voucherId },
      order: [["created_at", "ASC"]],
    });

    return conditions;
  }

  // UPDATE condition
  async updateCondition(conditionId, conditionData) {
    const condition = await VoucherCondition.findByPk(conditionId);
    if (!condition) {
      throw throwError(404, "Điều kiện không tồn tại");
    }

    await condition.update(conditionData);
    return condition;
  }

  // DELETE condition
  async deleteCondition(conditionId) {
    const condition = await VoucherCondition.findByPk(conditionId);
    if (!condition) {
      throw throwError(404, "Điều kiện không tồn tại");
    }

    await condition.destroy();
    return { message: "Xóa điều kiện thành công" };
  }

  // BULK update conditions for voucher
  async bulkUpdateConditions(voucherId, conditions) {
    const transaction = await VoucherCondition.sequelize.transaction();

    try {
      // Delete existing conditions
      await VoucherCondition.destroy({
        where: { voucher_id: voucherId },
        transaction,
      });

      // Create new conditions
      if (conditions && conditions.length > 0) {
        const conditionData = conditions?.map((condition) => ({
          ...condition,
          voucher_id: voucherId,
        }));
        await VoucherCondition.bulkCreate(conditionData, { transaction });
      }

      await transaction.commit();
      return await this.getVoucherConditions(voucherId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new VoucherConditionService();
