"use strict";

const {
  Product,
  PreorderCampaign,
  PreorderTier,
  PreorderOrder,
  User,
  ProductImage,
  PreorderRegistration,
  PreorderSlot,
  GuestSession,
  sequelize,
  Cart,
  CartItem,
  ProductVariant,
} = require("@/models");
const { Op } = require("sequelize");

const formatDate = require("@/utils/formatDate");
const { verifyPreorderToken } = require("./jwt.service");
const throwError = require("@/utils/throwError");

class PreorderService {
  static async register(data, user, ip, userAgent, guestSession) {
    const t = await sequelize.transaction();
    try {
      const { product_id, variant_id, tier_id, email, phone, username } = data;
      console.log("variant_id", variant_id);
      // 1️⃣ Lấy campaign đang "upcoming"
      const campaign = await PreorderCampaign.findOne({
        where: { product_id, status: "upcoming" },
        include: [{ model: PreorderTier, as: "tiers" }],
        order: [[{ model: PreorderTier, as: "tiers" }, "order_index", "ASC"]],
        transaction: t,
        lock: true,
      });

      if (!campaign) {
        await t.rollback();
        return {
          success: false,
          message: "Chiến dịch preorder không khả dụng để đăng ký",
        };
      }

      // 2️⃣ Xác định tier hợp lệ
      const tier = campaign.tiers.find((t) => t.id === Number(tier_id));
      if (!tier) {
        await t.rollback();
        return {
          success: false,
          message: "Tier không hợp lệ hoặc không thuộc chiến dịch này",
        };
      }

      // 3️⃣ Kiểm tra slot còn lại dựa trên PreorderSlot
      const reservedSlotsCount = await PreorderSlot.count({
        where: {
          tier_id: tier.id,
          status: { [Op.in]: ["reserved", "confirmed"] },
        },
        transaction: t,
        lock: true,
      });

      if (reservedSlotsCount >= tier.limit_quantity) {
        await t.rollback();
        return {
          success: false,
          message: `Tier "${tier.name}" đã hết suất. Vui lòng chọn tier khác.`,
        };
      }

      // 4️⃣ Kiểm tra trùng lặp (user hoặc guest)
      let existing;
      if (user) {
        existing = await PreorderRegistration.findOne({
          where: { campaign_id: campaign.id, product_id, customer_id: user.id },
          transaction: t,
        });
      } else if (guestSession) {
        existing = await PreorderRegistration.findOne({
          where: {
            campaign_id: campaign.id,
            product_id,
            guest_session_id: guestSession.id,
          },
          transaction: t,
        });
      } else {
        existing = await PreorderRegistration.findOne({
          where: { campaign_id: campaign.id, product_id, email },
          transaction: t,
        });
      }

      if (existing) {
        await t.rollback();
        return {
          success: false,
          message: "Bạn đã đăng ký preorder cho sản phẩm này rồi.",
          preorder: existing,
        };
      }

      // 5️⃣ Tạo bản ghi preorder
      const preorder = await PreorderRegistration.create(
        {
          campaign_id: campaign.id,
          product_id,
          variant_id,
          tier_id: tier.id,
          customer_id: user ? user.id : null,
          guest_session_id: guestSession ? guestSession.id : null,
          email: user?.email || email,
          phone,
          username,
          ip_address: ip,
          user_agent: userAgent,
          mail_sent: false,
        },
        { transaction: t }
      );

      // 6️⃣ Tạo slot cho preorder
      const slot = await PreorderSlot.create(
        {
          registration_id: preorder.id,
          campaign_id: campaign.id,
          tier_id: tier.id,
          status: "reserved",
          reserved_at: new Date(),
          expired_at: campaign.start_date,
        },
        { transaction: t }
      );

      await t.commit();

      return {
        success: true,
        message: `Đăng ký preorder thành công ở tier "${tier.name}"`,
        preorder,
        slot,
      };
    } catch (error) {
      console.error(error);
      await t.rollback();
      return {
        success: false,
        message: error.message || "Lỗi hệ thống",
        error,
      };
    }
  }

  static async getUpcomingCampaigns() {
    try {
      // 1. Lấy các campaign có status upcoming
      const campaigns = await PreorderCampaign.findAll({
        where: { status: "upcoming" },
        attributes: [
          "id",
          "product_id",
          "start_date",
          "end_date",
          "status",
          "note",
        ],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price", "slug"],
            include: [
              {
                model: ProductImage,
                as: "images",
                where: { is_main: true },
                required: false, // Sử dụng false để không bị lỗi khi không có image
                attributes: ["id", "image_url", "is_main"],
              },
            ],
          },
          {
            model: PreorderTier,
            as: "tiers",
            attributes: [
              "id",
              "name",
              "type",
              "price",
              "limit_quantity",
              "sold_quantity",
              "discount_percent",
              "order_index",
            ],
          },
        ],
        order: [["start_date", "ASC"]],
      });

      if (!campaigns || campaigns.length === 0) return [];

      // 2. Format dữ liệu
      const formattedCampaigns = campaigns?.map((campaign) => {
        const product = campaign.product;

        // Lấy image chính (nếu có)
        const mainImage =
          product?.images && product.images.length > 0
            ? product.images[0]
            : null;

        return {
          id: campaign.id,
          product: {
            id: product?.id || null,
            name: product?.name || null,
            price: product?.price || null,
            slug: product?.slug || null,
            image: mainImage?.image_url || null,
          },
          startDate: formatDate(campaign.start_date),
          endDate: formatDate(campaign.end_date),
          status: campaign.status,
          note: campaign.note,
          tiers: campaign.tiers?.map((tier) => ({
            id: tier.id,
            name: tier.name,
            type: tier.type,
            price: tier.price,
            limitQuantity: tier.limit_quantity,
            soldQuantity: tier.sold_quantity,
            discountPercent: tier.discount_percent,
            orderIndex: tier.order_index,
          })),
        };
      });

      return formattedCampaigns;
    } catch (error) {
      console.error("Error in getUpcomingCampaigns:", error);
      throw error;
    }
  }

  static async getPreOrderCampaigns() {
    try {
      const campaigns = await PreorderCampaign.findAll({
        where: { status: "open" },
        attributes: [
          "id",
          "product_id",
          "start_date",
          "end_date",
          "status",
          "note",
        ],
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "price", "slug"],
            include: [
              {
                model: ProductImage,
                as: "images",
                where: { is_main: true },
                required: false,
                attributes: ["id", "image_url", "is_main"],
              },
            ],
          },
          {
            model: PreorderTier,
            as: "tiers",
            attributes: [
              "id",
              "name",
              "type",
              "price",
              "limit_quantity",
              "sold_quantity",
              "discount_percent",
              "order_index",
            ],
          },
        ],
        order: [["start_date", "ASC"]],
      });

      if (!campaigns || campaigns.length === 0) return [];

      const formattedCampaigns = campaigns?.map((campaign) => {
        const product = campaign.product;
        const mainImage = product?.images?.[0] || null;

        // Tính tổng soldQuantity và limitQuantity cho tất cả tiers
        const totalSold = campaign.tiers.reduce(
          (sum, tier) => sum + (tier.sold_quantity || 0),
          0
        );
        const totalLimit = campaign.tiers.reduce(
          (sum, tier) => sum + (tier.limit_quantity || 0),
          0
        );

        return {
          id: campaign.id,
          title: product?.name || null,
          slug: product?.slug || "",
          status: `Số lượng đã đặt: ${totalSold}/${totalLimit}`,
          date: `Chiến dịch kết thúc: ${formatDate(campaign.end_date)}`,
          image: mainImage?.image_url || null,
          variant: "default",

          totalSold,
          totalLimit,
        };
      });

      return formattedCampaigns;
    } catch (error) {
      console.error("Error in getUpcomingCampaigns:", error);
      throw error;
    }
  }

  static async verifyPreorder(token, sessionId = null) {
    const t = await sequelize.transaction();
    let newItemId;

    try {
      // 🔹 Giải mã token
      const decoded = verifyPreorderToken(token);
      const { registration_id, guest_session_id, customer_id } = decoded;

      // 🔹 Điều kiện tìm kiếm registration
      const whereCondition = { id: registration_id };
      if (customer_id) whereCondition.customer_id = customer_id;
      else if (guest_session_id)
        whereCondition.guest_session_id = guest_session_id;
      else
        throw throwError(400, "Token không hợp lệ: thiếu thông tin định danh.");

      // 🔹 Lấy preorder registration
      const preorder = await PreorderRegistration.findOne({
        where: whereCondition,
        include: [
          { model: PreorderTier, as: "tier" },
          { model: Product, as: "product" },
          { model: PreorderCampaign, as: "campaign" },
        ],
        transaction: t,
        lock: true,
      });
      if (!preorder) throw throwError(404, "Preorder không tồn tại");

      // 🔹 Lấy slot
      const slot = await PreorderSlot.findOne({
        where: { registration_id: preorder.id },
        transaction: t,
        lock: true,
      });
      if (!slot || slot.status !== "reserved") {
        throw throwError(400, "Slot không hợp lệ hoặc đã hết hạn");
      }

      // 🔹 Cập nhật expired_at
      const now = new Date();
      slot.expired_at = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await slot.save({ transaction: t });

      // 🔹 Lấy hoặc tạo giỏ hàng
      let cart;
      if (preorder.customer_id) {
        cart = await Cart.findOne({
          where: { customer_id: preorder.customer_id, status: "active" },
          transaction: t,
        });
        if (!cart) {
          cart = await Cart.create(
            { customer_id: preorder.customer_id, status: "active" },
            { transaction: t }
          );
        }
      } else {
        cart = await Cart.findOne({
          where: {
            session_id: guest_session_id || sessionId,
            status: "active",
          },
          transaction: t,
        });
        if (!cart) {
          cart = await Cart.create(
            { session_id: guest_session_id || sessionId, status: "active" },
            { transaction: t }
          );
        }
      }

      // 🔹 Tạo CartItem mới
      const newItem = await CartItem.create(
        {
          cart_id: cart.id,
          product_id: preorder.product_id,
          preorder_slot_id: slot.id,
          tier_id: preorder.tier.id,
          variant_id: preorder.variant_id,
          quantity: 1,
          unit_price: preorder.tier.price,
          total_price: preorder.tier.price,
        },
        { transaction: t }
      );

      newItemId = newItem.id;
      await t.commit(); // ✅ Transaction kết thúc gọn gàng
    } catch (err) {
      if (!t.finished) await t.rollback(); // rollback an toàn
      console.log("❌ verifyPreorder error:", err);
      throw throwError(400, "Token không hợp lệ hoặc đã hết hạn.");
    }

    // ==============================
    // 🔹 PHẦN NÀY CHẠY NGOÀI TRANSACTION
    // ==============================
    try {
      // Lấy lại cartItem vừa tạo (include Product, ProductVariant)
      const cartItem = await CartItem.findOne({
        where: { id: newItemId },
        include: [
          {
            model: Product,
            attributes: ["id", "name", "slug"],
            as: "Product",
          },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url"],
            as: "ProductVariant",
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          message: "Không tìm thấy sản phẩm trong giỏ hàng",
        };
      }
      console.log("cartItem", cartItem);
      // 🔹 Format kết quả giống getCartItems()
      const productName = cartItem.Product?.name || "N/A";
      const variantFullName = cartItem.ProductVariant?.name || "N/A";
      let variantName = variantFullName;

      if (variantFullName.includes(productName)) {
        variantName = variantFullName.replace(productName, "").trim();
        if (variantName.startsWith("-"))
          variantName = variantName.substring(1).trim();
      }

      const formattedItem = {
        id: cartItem.id,
        name: productName,
        slug: cartItem.Product?.slug,
        variant: variantName,
        price: parseFloat(cartItem.unit_price) || 0,
        quantity: cartItem.quantity || 0,
        image: cartItem.ProductVariant?.image_url || "",
        checked: false,
      };

      return {
        success: true,
        data: formattedItem,
        message: "Verify và add sản phẩm vào cart thành công",
      };
    } catch (err) {
      console.error("⚠️ Error when formatting CartItem:", err);
      throw throwError(
        500,
        "Thêm vào giỏ hàng thành công nhưng lỗi khi load dữ liệu hiển thị."
      );
    }
  }

  static async addPreorderOpenItem({
    productId,
    tierId,
    variantId = null,
    customerId,
    sessionId,
    userAgent,
    ipAddress,
  }) {
    const t = await sequelize.transaction();
    let cartItemId;

    try {
      // 1️⃣ Lấy campaign đang open
      const campaign = await PreorderCampaign.findOne({
        where: { product_id: productId, status: "open" },
        include: [{ model: PreorderTier, as: "tiers" }],
        transaction: t,
        lock: true,
      });
      if (!campaign) throwError("Sản phẩm preorder không khả dụng", 400);

      // 2️⃣ Lấy tier hợp lệ
      const tier = campaign.tiers.find((t) => t.id === Number(tierId));
      if (!tier) throwError("Tier không hợp lệ", 400);

      // 3️⃣ Tìm hoặc tạo cart
      let cart;
      if (customerId) {
        cart = await Cart.findOne({
          where: { customer_id: customerId, status: "active" },
          transaction: t,
        });
        if (!cart) {
          cart = await Cart.create(
            {
              customer_id: customerId,
              status: "active",
              user_agent: userAgent,
              ip_address: ipAddress,
            },
            { transaction: t }
          );
        }
      } else if (sessionId) {
        cart = await Cart.findOne({
          where: { session_id: sessionId, status: "active" },
          transaction: t,
        });
        if (!cart) {
          cart = await Cart.create(
            {
              session_id: sessionId,
              status: "active",
              user_agent: userAgent,
              ip_address: ipAddress,
            },
            { transaction: t }
          );
        }
      } else {
        throwError("Thiếu customerId hoặc sessionId", 400);
      }

      // 4️⃣ Thêm hoặc cập nhật CartItem
      let cartItem = await CartItem.findOne({
        where: {
          cart_id: cart.id,
          product_id: productId,
          variant_id: variantId,
        },
        transaction: t,
      });

      if (cartItem) {
        cartItem.quantity += 1;
        cartItem.total_price = cartItem.quantity * tier.price;
        await cartItem.save({ transaction: t });
      } else {
        cartItem = await CartItem.create(
          {
            cart_id: cart.id,
            product_id: productId,
            variant_id: variantId,
            tier_id: tier.id,
            quantity: 1,
            unit_price: tier.price,
            total_price: tier.price,
            discount_amount: 0,
          },
          { transaction: t }
        );
      }

      cartItemId = cartItem.id;

      // 5️⃣ Cập nhật cart totals
      const totalAmount = await CartItem.sum("total_price", {
        where: { cart_id: cart.id },
        transaction: t,
      });
      cart.total_amount = totalAmount;
      cart.final_amount = totalAmount;
      await cart.save({ transaction: t });

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      console.error("addPreorderOpenItem error:", err);
      throw err;
    }

    // ==============================
    // 🔹 Format trả về giống getCartItems()
    // ==============================
    try {
      const cartItem = await CartItem.findOne({
        where: { id: cartItemId },
        include: [
          { model: Product, attributes: ["id", "name", "slug"], as: "Product" },
          {
            model: ProductVariant,
            attributes: ["id", "name", "image_url"],
            as: "ProductVariant",
          },
        ],
      });

      if (!cartItem) {
        return {
          success: false,
          data: [],
          message: "Không tìm thấy sản phẩm trong giỏ hàng",
        };
      }

      const productName = cartItem.Product?.name || "N/A";
      const variantFullName = cartItem.ProductVariant?.name || "N/A";

      let variantName = variantFullName;
      if (variantFullName.includes(productName)) {
        variantName = variantFullName.replace(productName, "").trim();
        if (variantName.startsWith("-"))
          variantName = variantName.substring(1).trim();
      }

      const formattedItem = {
        id: cartItem.id,
        name: productName,
        slug: cartItem.Product?.slug,
        variant: variantName,
        price: parseFloat(cartItem.unit_price) || 0,
        quantity: cartItem.quantity || 0,
        image: cartItem.ProductVariant?.image_url || "",
        checked: false,
      };

      return {
        success: true,
        data: [formattedItem],
        totalItems: 1,
        message: "Thêm sản phẩm preorder vào giỏ hàng thành công",
      };
    } catch (err) {
      console.error("Error formatting CartItem:", err);
      return {
        success: true,
        data: [],
        message: "Thêm sản phẩm thành công nhưng lỗi khi load dữ liệu hiển thị",
      };
    }
  }

  static async createCampaign({
    productId,
    startDate,
    endDate,
    tiersData,
    note,
  }) {
    const t = await sequelize.transaction();
    try {
      const campaign = await PreorderCampaign.create(
        {
          product_id: productId,
          start_date: startDate,
          end_date: endDate,
          status: "upcoming",
          note: note || null,
        },
        { transaction: t }
      );

      // tạo tiers
      const tiersToCreate = tiersData?.map((tier) => ({
        ...tier,
        campaign_id: campaign.id,
        sold_quantity: 0,
      }));
      await PreorderTier.bulkCreate(tiersToCreate, { transaction: t });

      // nothing else, commit
      await t.commit();
      return campaign;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  static async getActiveCampaigns({ limit = 20, offset = 0 } = {}) {
    return PreorderCampaign.findAll({
      where: {
        status: "active",
      },
      include: [
        { model: PreorderTier, as: "tiers" },
        { model: Product, as: "product" },
      ],
      order: [["start_date", "ASC"]],
      limit,
      offset,
    });
  }

  static async getCampaignDetail(id) {
    return PreorderCampaign.findByPk(id, {
      include: [
        { model: PreorderTier, as: "tiers", order: [["order_index", "ASC"]] },
        { model: Product, as: "product" },
      ],
    });
  }

  /**
   * Đặt trước: check slot, tạo preorder order, cập nhật sold_quantity
   * Trả về object { order, remainingInTier }
   */
  static async placePreorder({
    userId = null,
    guestEmail = null,
    campaignId,
    tierId,
    quantity = 1,
  }) {
    if (!campaignId || !tierId)
      throw new Error("campaignId and tierId are required");

    // Sử dụng transaction để tránh race condition
    const t = await sequelize.transaction();
    try {
      // lock the tier row FOR UPDATE (via transaction + findByPk with lock)
      const tier = await PreorderTier.findByPk(tierId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!tier) throw new Error("Tier not found");

      // If limit_quantity is null => unlimited
      if (tier.limit_quantity !== null) {
        const available = tier.limit_quantity - tier.sold_quantity;
        if (available <= 0) {
          throw new Error("This tier is sold out");
        }
        if (quantity > available) {
          throw new Error(`Only ${available} slots remaining in this tier`);
        }
      }

      // create preorder order
      const amount = Number(tier.price) * Number(quantity);
      const order = await PreorderOrder.create(
        {
          tier_id: tier.id,
          campaign_id: campaignId,
          user_id: userId,
          guest_email: guestEmail,
          quantity,
          amount,
          deposit_amount: null,
          status: "pending",
        },
        { transaction: t }
      );

      // update sold_quantity
      await tier.increment({ sold_quantity: quantity }, { transaction: t });

      // if tier is now sold out, mark logic could be handled elsewhere or here
      if (
        tier.limit_quantity !== null &&
        tier.sold_quantity + quantity >= tier.limit_quantity
      ) {
        // optional: set a flag or process next tier
        // We leave setting status/processing to cron or to a helper
      }

      // set product.status = 'pre_order' if campaign active
      const campaign = await PreorderCampaign.findByPk(campaignId, {
        transaction: t,
      });
      if (campaign && campaign.status === "active") {
        await Product.update(
          { status: "pre_order" },
          { where: { id: campaign.product_id }, transaction: t }
        );
      }

      await t.commit();
      return { order };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Dùng cron job để chuyển trạng thái campaign theo start_date/end_date:
   * - upcoming -> active (and set product.status = 'pre_order')
   * - active -> ended (and set product.status = 'available')
   */
  static async closeAndActivateCampaigns() {
    const t = await sequelize.transaction();
    try {
      const now = new Date();

      // Activate campaigns where start_date <= now AND status = 'upcoming'
      const toActivate = await PreorderCampaign.findAll({
        where: {
          status: "upcoming",
          start_date: { [Op.lte]: now },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const c of toActivate) {
        await c.update({ status: "active" }, { transaction: t });
        await Product.update(
          { status: "pre_order" },
          { where: { id: c.product_id }, transaction: t }
        );
      }

      // End campaigns where end_date <= now AND status = 'active' or 'upcoming' (safety)
      const toEnd = await PreorderCampaign.findAll({
        where: {
          status: { [Op.in]: ["active", "upcoming"] },
          end_date: { [Op.lte]: now },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const c of toEnd) {
        await c.update({ status: "ended" }, { transaction: t });

        // When ended, put product to available
        await Product.update(
          { status: "available" },
          { where: { id: c.product_id }, transaction: t }
        );

        // Optionally: convert pending preorder_orders to ready-to-checkout / create real orders
      }

      await t.commit();
      return { activated: toActivate.length, ended: toEnd.length };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Helper: return next available tier if current is sold out.
   * Ordered by order_index ascending.
   */
  static async findNextAvailableTier(campaignId) {
    // find tiers ordered
    const tiers = await PreorderTier.findAll({
      where: { campaign_id: campaignId },
      order: [["order_index", "ASC"]],
    });

    for (const tier of tiers) {
      if (tier.limit_quantity === null) return tier;
      if (tier.sold_quantity < tier.limit_quantity) return tier;
    }
    return null;
  }
}

module.exports = PreorderService;
