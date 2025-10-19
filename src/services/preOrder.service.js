"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  Product,
  PreorderCampaign,
  PreorderTier,
  PreorderOrder,
  User,
  ProductImage,
  PreorderRegistration,
  GuestSession,
} = require("@/models");
const formatDate = require("@/utils/formatDate");
const { dispatch } = require("@/utils/queue");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SECRET = process.env.GUEST_SECRET_KEY || "guest_secret_key";
const { SESSION_ID_EXPIRES_IN } = require("@/config/auth");

class PreorderService {
  static async register(data, user, ip, userAgent, guestSession) {
    try {
      const { product_id, tier_id, email, phone, username } = data;

      // 1️⃣ Lấy campaign đang "upcoming"
      const campaign = await PreorderCampaign.findOne({
        where: { product_id: product_id, status: "upcoming" },
        include: [{ model: PreorderTier, as: "tiers" }],
        order: [[{ model: PreorderTier, as: "tiers" }, "order_index", "ASC"]],
      });

      if (!campaign) {
        return {
          success: false,
          message: "Chiến dịch preorder không khả dụng để đăng ký",
        };
      }

      // 2️⃣ Xác định tier hợp lệ
      let tier = null;
      if (tier_id) {
        tier = campaign.tiers.find((t) => t.id === Number(tier_id));
        if (!tier) {
          return {
            success: false,
            message: "Tier không hợp lệ hoặc không thuộc chiến dịch này",
          };
        }
      } else {
        tier = campaign.tiers?.[0]; // fallback: tier đầu tiên
      }

      if (!tier) {
        return {
          success: false,
          message: "Không tìm thấy tier hợp lệ trong chiến dịch",
        };
      }

      // 3️⃣ Luồng Customer (đã đăng nhập)
      if (user) {
        const existing = await PreorderRegistration.findOne({
          where: {
            product_id,
            customer_id: user.id,
            campaign_id: campaign.id,
          },
        });

        if (existing) {
          return {
            success: false,
            message: "Bạn đã đăng ký preorder cho sản phẩm này",
            preorder: existing,
          };
        }

        const preorder = await PreorderRegistration.create({
          campaign_id: campaign.id,
          product_id,
          tier_id: tier.id,
          customer_id: user.id,
          email: user.email,
          phone,
          username,
          mail_sent: false,
        });

        return {
          success: true,
          message: "Đăng ký preorder thành công",
          preorder,
        };
      }

      // 4️⃣ Luồng Guest (chưa đăng nhập)
      const session = guestSession;

      const existing = await PreorderRegistration.findOne({
        where: { product_id, email, campaign_id: campaign.id },
      });

      if (existing) {
        return {
          success: false,
          message: "Email này đã đăng ký preorder cho sản phẩm này",
          preorder: existing,
        };
      }

      const preorder = await PreorderRegistration.create({
        campaign_id: campaign.id,
        product_id,
        tier_id: tier.id,
        guest_session_id: session.id,
        email,
        phone,
        username,
        mail_sent: false,
      });

      return {
        success: true,
        message: "Đăng ký preorder thành công (khách vãng lai)",
        preorder,
      };
    } catch (error) {
      console.error(error);
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
      const formattedCampaigns = campaigns.map((campaign) => {
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
          tiers: campaign.tiers.map((tier) => ({
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
      const tiersToCreate = tiersData.map((tier) => ({
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
