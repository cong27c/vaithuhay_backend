const {
  Order,
  OrderItem,
  OrderAddress,
  Payment,
  Shipment,
  Voucher,
  Product,
  ProductVariant,
  sequelize,
  ProductImage,
  ProductDiscount,
  AttributeValue,
  Attribute,
} = require("@/models/index");
const { Op } = require("sequelize");

class OrderService {
  /**
   * Lấy danh sách đơn hàng với phân trang và filter
   */
  async getAllOrders(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        start_date,
        end_date,
        customer_id,
        search,
        payment_status,
        shipment_status,
      } = filters;

      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = {};

      if (status) whereConditions.status = status;
      if (customer_id) whereConditions.customer_id = customer_id;

      // Date range filter
      if (start_date || end_date) {
        whereConditions.order_date = {};
        if (start_date)
          whereConditions.order_date[Op.gte] = new Date(start_date);
        if (end_date) whereConditions.order_date[Op.lte] = new Date(end_date);
      }

      // Search by order number
      if (search) {
        whereConditions.order_number = { [Op.like]: `%${search}%` };
      }

      // Build include conditions với where riêng
      const includeConditions = [
        {
          model: OrderAddress,
          as: "orderAddress",
          attributes: ["full_name", "phone", "email", "province", "district"],
        },
        {
          model: Payment,
          as: "payment",
          attributes: ["method", "status", "amount", "paid_at"],
        },
        {
          model: Shipment,
          as: "shipment",
          attributes: ["carrier", "tracking_code", "status", "shipping_fee"],
        },
      ];

      // Thêm điều kiện filter cho payment nếu có
      if (payment_status) {
        includeConditions[1].where = { status: payment_status };
      }

      // Thêm điều kiện filter cho shipment nếu có
      if (shipment_status) {
        includeConditions[2].where = { status: shipment_status };
      }

      const { count, rows: orders } = await Order.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
        attributes: [
          "id",
          "order_number",
          "order_date",
          "total_amount",
          "discount_amount",
          "final_amount",
          "status",
          "created_at",
          "customer_id",
          "guest_session_id",
        ],
        order: [["order_date", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
      });

      return {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (err) {
      console.error("Lỗi service getAllOrders:", err);
      throw err;
    }
  }

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  async getOrderById(orderId) {
    try {
      const order = await Order.findByPk(orderId, {
        include: [
          {
            model: OrderAddress,
            as: "orderAddress",
          },
          {
            model: OrderItem,
            as: "items",
            include: [
              {
                model: Product,
                as: "product",
                attributes: [
                  "id",
                  "name",
                  "slug",
                  "price",
                  "description",
                  "status",
                ],
                include: [
                  {
                    model: ProductImage,
                    as: "mainImage",
                    attributes: ["image_url"],
                    where: { is_main: true },
                    required: false,
                  },
                  {
                    model: ProductDiscount,
                    as: "discount",
                    attributes: ["id", "discount_value", "discount_type"],
                    required: false,
                  },
                ],
              },
              {
                model: ProductVariant,
                as: "variant",
                attributes: [
                  "id",
                  "name",
                  "sku",
                  "price",
                  "stock",
                  "image_url",
                  "variant_type",
                  "variant_value",
                ],
                include: [
                  {
                    model: AttributeValue,
                    as: "attribute_values",
                    attributes: ["id", "value"],
                    include: [
                      {
                        model: Attribute,
                        as: "attribute",
                        attributes: ["id", "name"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: Payment,
            as: "payment",
          },
          {
            model: Shipment,
            as: "shipment",
          },
          {
            model: Voucher,
            as: "voucher",
            attributes: ["id", "code", "voucher_value", "voucher_type"],
          },
        ],
      });

      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      // Format lại dữ liệu attribute cho dễ sử dụng
      if (order.items) {
        order.items = order.items.map((item) => {
          if (item.variant && item.variant.attribute_values) {
            // Nhóm attribute theo type
            const attributes = {};
            item.variant.attribute_values.forEach((attrValue) => {
              const attrName = attrValue.attribute?.name;
              if (attrName) {
                attributes[attrName] = attrValue.value;
              }
            });
            item.variant.dataValues.attributes = attributes;
          }
          return item;
        });
      }

      return order;
    } catch (err) {
      console.error("Lỗi service getOrderById:", err);
      throw err;
    }
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(orderId, status, adminId) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });

      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      // Validate status transition
      const validTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      };

      const allowedStatuses = validTransitions[order.status] || [];
      if (!allowedStatuses.includes(status)) {
        throw new Error(`Không thể chuyển từ ${order.status} sang ${status}`);
      }

      await order.update(
        {
          status,
          updated_at: new Date(),
        },
        { transaction }
      );

      // Ghi log lịch sử đơn hàng
      await this._createOrderHistory(
        {
          order_id: orderId,
          action: "STATUS_UPDATE",
          from_status: order.status,
          to_status: status,
          admin_id: adminId,
          notes: `Cập nhật trạng thái bởi admin`,
        },
        transaction
      );

      await transaction.commit();
      return order;
    } catch (err) {
      await transaction.rollback();
      console.error("Lỗi service updateOrderStatus:", err);
      throw err;
    }
  }

  /**
   * Cập nhật thông tin thanh toán
   */
  async updatePaymentStatus(orderId, paymentData) {
    const transaction = await sequelize.transaction();

    try {
      const payment = await Payment.findOne({
        where: { order_id: orderId },
        transaction,
      });

      if (!payment) {
        throw new Error("Thông tin thanh toán không tồn tại");
      }

      await payment.update(
        {
          status: paymentData.status,
          paid_at: paymentData.paid_at || null,
          updated_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      return payment;
    } catch (err) {
      await transaction.rollback();
      console.error("Lỗi service updatePaymentStatus:", err);
      throw err;
    }
  }

  /**
   * Cập nhật thông tin vận chuyển
   */
  async updateShipmentStatus(orderId, shipmentData) {
    const transaction = await sequelize.transaction();

    try {
      const shipment = await Shipment.findOne({
        where: { order_id: orderId },
        transaction,
      });

      if (!shipment) {
        throw new Error("Thông tin vận chuyển không tồn tại");
      }

      const updateData = {
        status: shipmentData.status,
        tracking_code: shipmentData.tracking_code,
        carrier: shipmentData.carrier,
        updated_at: new Date(),
      };

      // Cập nhật thời gian giao hàng nếu trạng thái là delivered
      if (shipmentData.status === "delivered" && !shipment.delivered_at) {
        updateData.delivered_at = new Date();
      }

      // Cập nhật thời gian ship nếu trạng thái là shipping
      if (shipmentData.status === "shipping" && !shipment.shipped_at) {
        updateData.shipped_at = new Date();
      }

      await shipment.update(updateData, { transaction });

      await transaction.commit();
      return shipment;
    } catch (err) {
      await transaction.rollback();
      console.error("Lỗi service updateShipmentStatus:", err);
      throw err;
    }
  }

  /**
   * Cập nhật thông tin đơn hàng
   */
  async updateOrder(orderId, updateData) {
    try {
      const order = await Order.findByPk(orderId);

      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      // Only allow updating specific fields
      const allowedFields = [
        "discount_amount",
        "final_amount",
        "status",
        "voucher_id",
      ];
      const filteredData = {};

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      filteredData.updated_at = new Date();

      await order.update(filteredData);
      return order;
    } catch (err) {
      console.error("Lỗi service updateOrder:", err);
      throw err;
    }
  }

  /**
   * Xóa đơn hàng
   */
  async deleteOrder(orderId) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });

      if (!order) {
        throw new Error("Đơn hàng không tồn tại");
      }

      // Check if order can be deleted (only pending or cancelled orders)
      if (!["pending", "cancelled"].includes(order.status)) {
        throw new Error(
          "Chỉ có thể xóa đơn hàng ở trạng thái pending hoặc cancelled"
        );
      }

      await Order.destroy({
        where: { id: orderId },
        transaction,
      });

      await transaction.commit();

      return {
        message: "Đơn hàng đã được xóa thành công",
        deletedOrderId: orderId,
      };
    } catch (err) {
      await transaction.rollback();
      console.error("Lỗi service deleteOrder:", err);
      throw err;
    }
  }

  /**
   * Lấy thống kê đơn hàng
   */
  async getOrderStats(timeRange = "month") {
    try {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case "day":
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      const stats = await Order.findAll({
        where: {
          order_date: {
            [Op.gte]: startDate,
          },
        },
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "total_orders"],
          [sequelize.fn("SUM", sequelize.col("final_amount")), "total_revenue"],
          [
            sequelize.fn(
              "AVG",
              sequelize.literal(
                "CASE WHEN status = 'delivered' THEN final_amount ELSE NULL END"
              )
            ),
            "avg_order_value",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN status = 'delivered' THEN 1 ELSE NULL END"
              )
            ),
            "delivered_orders",
          ],
        ],
        raw: true,
      });

      return stats[0];
    } catch (err) {
      console.error("Lỗi service getOrderStats:", err);
      throw err;
    }
  }

  /**
   * Lấy analytics đơn hàng
   */
  async getOrderAnalytics(orderId) {
    try {
      const order = await this.getOrderById(orderId);

      // Calculate analytics
      const itemsCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const averageItemPrice =
        itemsCount > 0 ? order.final_amount / itemsCount : 0;

      const analytics = {
        order_id: order.id,
        items_count: itemsCount,
        average_item_price: averageItemPrice,
        discount_rate:
          order.total_amount > 0
            ? ((order.discount_amount / order.total_amount) * 100).toFixed(2)
            : "0.00",
        fulfillment_time: this._calculateFulfillmentTime(order),
        customer_type: order.customer_id ? "registered" : "guest",
        total_amount: order.total_amount,
        final_amount: order.final_amount,
        discount_amount: order.discount_amount,
        payment_status: order.payment?.status || "unknown",
        shipment_status: order.shipment?.status || "unknown",
      };

      return analytics;
    } catch (err) {
      console.error("Lỗi service getOrderAnalytics:", err);
      throw err;
    }
  }

  /**
   * Tìm kiếm đơn hàng nâng cao
   */
  async searchOrders(searchCriteria) {
    try {
      const {
        phone,
        email,
        product_name,
        tracking_code,
        limit = 10,
      } = searchCriteria;

      const whereConditions = {};
      const includeConditions = [];

      // Tìm theo số điện thoại
      if (phone) {
        includeConditions.push({
          model: OrderAddress,
          as: "orderAddress",
          where: { phone: { [Op.like]: `%${phone}%` } },
          required: true,
        });
      }

      // Tìm theo email
      if (email) {
        includeConditions.push({
          model: OrderAddress,
          as: "orderAddress",
          where: { email: { [Op.like]: `%${email}%` } },
          required: true,
        });
      }

      // Tìm theo tên sản phẩm
      if (product_name) {
        includeConditions.push({
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              where: { name: { [Op.like]: `%${product_name}%` } },
            },
          ],
          required: true,
        });
      }

      // Tìm theo mã tracking
      if (tracking_code) {
        includeConditions.push({
          model: Shipment,
          as: "shipment",
          where: { tracking_code: { [Op.like]: `%${tracking_code}%` } },
          required: true,
        });
      }

      const orders = await Order.findAll({
        where: whereConditions,
        include: includeConditions,
        limit: parseInt(limit),
        order: [["order_date", "DESC"]],
      });

      return orders;
    } catch (err) {
      console.error("Lỗi service searchOrders:", err);
      throw err;
    }
  }

  /**
   * Private method: Tạo lịch sử đơn hàng
   */
  async _createOrderHistory(historyData, transaction) {
    // Implementation for order history tracking
    // This would create a record in order_histories table
    // Example:
    // return await OrderHistory.create(historyData, { transaction });
    console.log("Creating order history:", historyData);
    return Promise.resolve();
  }

  /**
   * Private method: Tính thời gian hoàn thành
   */
  _calculateFulfillmentTime(order) {
    if (order.status !== "delivered" || !order.order_date) return null;

    const orderDate = new Date(order.order_date);
    const deliveredDate = order.shipment?.delivered_at
      ? new Date(order.shipment.delivered_at)
      : new Date(order.updated_at);

    return Math.ceil((deliveredDate - orderDate) / (1000 * 60 * 60 * 24)); // days
  }
}

module.exports = new OrderService();
