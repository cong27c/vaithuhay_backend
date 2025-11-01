const {
  Voucher,
  VoucherCondition,
  VoucherUsage,
  User,
  Order,
} = require("@/models");
const throwError = require("@/utils/throwError");

class VoucherService {
  // CREATE
  async createVoucher(voucherData) {
    const transaction = await Voucher.sequelize.transaction();

    try {
      const { conditions, ...voucherInfo } = voucherData;

      // Check duplicate code
      const existingVoucher = await Voucher.findOne({
        where: { code: voucherInfo.code },
      });
      if (existingVoucher) {
        throw throwError(400, "Mã voucher đã tồn tại");
      }

      // Create voucher
      const voucher = await Voucher.create(voucherInfo, { transaction });

      // Create conditions if any
      if (conditions && conditions.length > 0) {
        const conditionData = conditions.map((condition) => ({
          ...condition,
          voucher_id: voucher.id,
        }));
        await VoucherCondition.bulkCreate(conditionData, { transaction });
      }

      await transaction.commit();

      // Return voucher with conditions
      const result = await Voucher.findByPk(voucher.id, {
        include: [
          {
            model: VoucherCondition,
            as: "conditions",
            attributes: ["id", "condition_type", "operator", "condition_value"],
          },
        ],
      });

      return result;
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }

  // READ - Get all vouchers with pagination
  async getAllVouchers({ page = 1, limit = 10, search = "" }) {
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [Op.or]: [
            { code: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await Voucher.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: VoucherCondition,
          as: "conditions",
          attributes: ["id", "condition_type", "operator", "condition_value"],
        },
        {
          model: VoucherUsage,
          as: "Usages",
          attributes: ["id"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
    });

    return {
      vouchers: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    };
  }

  // READ - Get voucher by ID
  async getVoucherById(id) {
    const voucher = await Voucher.findByPk(id, {
      include: [
        {
          model: VoucherCondition,
          as: "conditions",
          attributes: ["id", "condition_type", "operator", "condition_value"],
        },
        {
          model: VoucherUsage,
          as: "Usages",
          attributes: ["id", "user_id", "order_id", "used_at"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "email", "username"],
            },
            {
              model: Order,
              as: "order",
              attributes: ["id", "total_amount"],
            },
          ],
        },
      ],
    });

    if (!voucher) {
      throw throwError(404, "Voucher không tồn tại");
    }

    return voucher;
  }

  // READ - Get voucher by code
  async getVoucherByCode(code) {
    const voucher = await Voucher.findOne({
      where: { code },
      include: [
        {
          model: VoucherCondition,
          as: "conditions",
          attributes: ["id", "condition_type", "operator", "condition_value"],
        },
      ],
    });

    if (!voucher) {
      throw throwError(404, "Voucher không tồn tại");
    }

    return voucher;
  }

  // UPDATE
  async updateVoucher(id, voucherData) {
    const transaction = await Voucher.sequelize.transaction();

    try {
      const { conditions, ...voucherInfo } = voucherData;

      const voucher = await Voucher.findByPk(id);
      if (!voucher) {
        throw throwError(404, "Voucher không tồn tại");
      }

      // Check duplicate code (exclude current voucher)
      if (voucherInfo.code && voucherInfo.code !== voucher.code) {
        const existingVoucher = await Voucher.findOne({
          where: { code: voucherInfo.code, id: { [Op.ne]: id } },
        });
        if (existingVoucher) {
          throw throwError(400, "Mã voucher đã tồn tại");
        }
      }

      // Update voucher
      await voucher.update(voucherInfo, { transaction });

      // Update conditions - delete old and create new
      if (conditions) {
        await VoucherCondition.destroy({
          where: { voucher_id: id },
          transaction,
        });

        if (conditions.length > 0) {
          const conditionData = conditions.map((condition) => ({
            ...condition,
            voucher_id: id,
          }));
          await VoucherCondition.bulkCreate(conditionData, { transaction });
        }
      }

      await transaction.commit();

      // Return updated voucher
      const result = await this.getVoucherById(id);
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // DELETE
  async deleteVoucher(id) {
    const transaction = await Voucher.sequelize.transaction();

    try {
      const voucher = await Voucher.findByPk(id);
      if (!voucher) {
        throw throwError(404, "Voucher không tồn tại");
      }

      // Check if voucher has been used
      const usageCount = await VoucherUsage.count({
        where: { voucher_id: id },
      });

      if (usageCount > 0) {
        throw throwError(400, "Không thể xóa voucher đã được sử dụng");
      }

      // Delete conditions first (CASCADE should handle this, but explicit is better)
      await VoucherCondition.destroy({
        where: { voucher_id: id },
        transaction,
      });

      // Delete voucher
      await voucher.destroy({ transaction });

      await transaction.commit();
      return { message: "Xóa voucher thành công" };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // UPDATE STATUS
  async updateVoucherStatus(id, status) {
    try {
      const voucher = await Voucher.findByPk(id);
      if (!voucher) throw throwError(404, "Voucher không tồn tại");

      const allowedStatus = ["active", "inactive", "expired"];
      if (!allowedStatus.includes(status)) {
        throw throwError(400, "Trạng thái không hợp lệ");
      }

      // Nếu chuyển sang expired => cập nhật end_date = hôm nay
      let updateData = { status };
      if (status === "expired") {
        updateData.end_date = new Date();
      }

      await voucher.update(updateData);
      return await this.getVoucherById(id);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // VALIDATE VOUCHER (for checkout)
  async validateVoucher(code, userId, orderData) {
    const voucher = await this.getVoucherByCode(code);

    // Check status
    if (voucher.status !== "active") {
      throw throwError(400, "Voucher không khả dụng");
    }

    // Check date validity
    const now = new Date();
    if (voucher.start_date && new Date(voucher.start_date) > now) {
      throw throwError(400, "Voucher chưa có hiệu lực");
    }
    if (voucher.end_date && new Date(voucher.end_date) < now) {
      throw throwError(400, "Voucher đã hết hạn");
    }

    // Check usage limit
    if (voucher.usage_limit) {
      const usageCount = await VoucherUsage.count({
        where: { voucher_id: voucher.id },
      });
      if (usageCount >= voucher.usage_limit) {
        throw throwError(400, "Voucher đã hết lượt sử dụng");
      }
    }

    // Check per user limit
    const userUsageCount = await VoucherUsage.count({
      where: { voucher_id: voucher.id, user_id: userId },
    });
    if (userUsageCount >= voucher.per_user_limit) {
      throw throwError(400, "Bạn đã sử dụng hết lượt cho voucher này");
    }

    // Check order amount
    if (orderData.total_amount < voucher.min_order_amount) {
      throw throwError(
        400,
        `Đơn hàng tối thiểu ${voucher.min_order_amount} VND`
      );
    }

    // Validate conditions
    await this.validateConditions(voucher.conditions, orderData, userId);

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        voucher_type: voucher.voucher_type,
        voucher_value: voucher.voucher_value,
        discount_amount: this.calculateDiscount(
          voucher,
          orderData.total_amount
        ),
      },
    };
  }

  // VALIDATE CONDITIONS
  async validateConditions(conditions, orderData, userId) {
    for (const condition of conditions) {
      const parsedValue = condition.getParsedValue
        ? condition.getParsedValue()
        : condition.condition_value;

      switch (condition.condition_type) {
        case "min_order_value":
          if (
            !this.compareValues(
              orderData.total_amount,
              condition.operator,
              parsedValue
            )
          ) {
            throw throwError(400, `Đơn hàng không đáp ứng điều kiện giá trị`);
          }
          break;

        case "category":
          const orderCategories = orderData.items.map(
            (item) => item.category_id
          );
          if (
            !this.checkInclusion(
              orderCategories,
              condition.operator,
              parsedValue
            )
          ) {
            throw throwError(400, `Sản phẩm không thuộc danh mục được áp dụng`);
          }
          break;

        case "product":
          const orderProducts = orderData.items.map((item) => item.product_id);
          if (
            !this.checkInclusion(orderProducts, condition.operator, parsedValue)
          ) {
            throw throwError(400, `Sản phẩm không được áp dụng voucher`);
          }
          break;

        case "user_group":
          // Implement user group logic based on your business
          if (!this.checkUserGroup(userId, condition.operator, parsedValue)) {
            throw throwError(
              400,
              `Voucher không áp dụng cho nhóm người dùng của bạn`
            );
          }
          break;

        case "first_order":
          const orderCount = await Order.count({ where: { user_id: userId } });
          if (parsedValue === "true" && orderCount > 0) {
            throw throwError(400, `Voucher chỉ áp dụng cho đơn hàng đầu tiên`);
          }
          break;

        case "specific_user":
          if (!this.checkInclusion([userId], condition.operator, parsedValue)) {
            throw throwError(
              400,
              `Voucher không áp dụng cho tài khoản của bạn`
            );
          }
          break;

        case "time_frame":
          const currentTime = new Date().toTimeString().split(" ")[0];
          if (
            !this.checkTimeFrame(currentTime, condition.operator, parsedValue)
          ) {
            throw throwError(400, `Voucher không khả dụng trong thời gian này`);
          }
          break;
      }
    }
  }

  // HELPER METHODS
  compareValues(value1, operator, value2) {
    switch (operator) {
      case "=":
        return value1 == value2;
      case ">":
        return value1 > value2;
      case "<":
        return value1 < value2;
      case ">=":
        return value1 >= value2;
      case "<=":
        return value1 <= value2;
      default:
        return false;
    }
  }

  checkInclusion(array, operator, values) {
    const valueArray = Array.isArray(values) ? values : [values];

    switch (operator) {
      case "in":
        return array.some((item) => valueArray.includes(item));
      case "not_in":
        return !array.some((item) => valueArray.includes(item));
      default:
        return false;
    }
  }

  checkUserGroup(userId, operator, userGroup) {
    // Implement based on your user group system
    // This is a placeholder implementation
    return true;
  }

  checkTimeFrame(currentTime, operator, timeFrame) {
    const { start, end } = timeFrame;
    return currentTime >= start && currentTime <= end;
  }

  calculateDiscount(voucher, totalAmount) {
    if (voucher.voucher_type === "percent") {
      const discount = totalAmount * (voucher.voucher_value / 100);
      return Math.min(discount, totalAmount);
    } else {
      return Math.min(voucher.voucher_value, totalAmount);
    }
  }
}

module.exports = new VoucherService();
