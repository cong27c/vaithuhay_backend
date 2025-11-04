const {
  Product,
  ProductDiscount,
  ProductDetail,
  ProductImage,
  ProductVariant,
  Blog,
  AttributeValue,
  Attribute,
  PreorderCampaign,
  PreorderTier,
  PreorderRegistration,
  PreorderSlot,
} = require("@/models");
const formatCurrency = require("@/utils/formatCurrency");
const formatDate = require("@/utils/formatDate");
const parseHtmlToBlocks = require("@/utils/parseHtmlToBlocks");
const { Op } = require("sequelize");

const productService = {
  async create(data) {
    return await Product.create(data);
  },
  async bulkCreate(dataArray, options = {}) {
    return await Product.bulkCreate(dataArray, {
      ignoreDuplicates: true, // bỏ qua lỗi trùng slug (unique)
      ...options,
    });
  },

  async getProductHighlight(productId) {
    const detail = await ProductDetail.findOne({
      where: { product_id: productId },
      attributes: ["highlights"],
    });

    if (!detail?.highlights) return null;

    try {
      const parsed = JSON.parse(detail.highlights);
      return {
        name: parsed.name || null,
        image: parsed.img || null,
        highlightsHtml: (parsed.highlights_html || [])?.map((item) => ({
          feature: item.feature || "",
          description: item.description || "",
        })),
      };
    } catch (err) {
      console.error("Parse highlights error:", err);
      return null;
    }
  },

  async getProductBlogs(productId) {
    try {
      const blogs = await Blog.findAll({
        include: [
          {
            model: Product,
            as: "products",
            where: { id: productId },
            attributes: [],
            through: { attributes: [] },
          },
        ],
        attributes: ["title", "content_html", "content_text"],
        where: {
          title: {
            [Op.ne]: "HÌNH ẢNH / VIDEO", // loại bỏ blog có title này
          },
        },
      });

      return blogs?.map((b) => ({
        title: b.title,
        contentHtml: parseHtmlToBlocks(b.content_html),
        contentText: b.content_text,
      }));
    } catch (error) {
      console.log(error);
    }
  },

  async checkExistingRegistration(
    customerId,
    guestSessionId,
    productId,
    campaignId
  ) {
    const whereCondition = {
      product_id: productId,
      campaign_id: campaignId,
      status: ["pending", "confirmed"], // Chỉ kiểm tra các trạng thái hợp lệ
    };

    // Kiểm tra theo customer_id (đã đăng nhập) hoặc guest_session_id (khách vãng lai)
    if (customerId) {
      whereCondition.customer_id = customerId;
    } else if (guestSessionId) {
      whereCondition.guest_session_id = guestSessionId;
    }

    const existingRegistration = await PreorderRegistration.findOne({
      where: whereCondition,
    });

    return !!existingRegistration;
  },

  // ---------------- MAIN PRODUCT SERVICE ----------------
  async getProductBySlug(slug, customerId = null, guestSessionId = null) {
    try {
      // 1. Lấy product với trường status
      const product = await Product.findOne({
        where: { slug },
        attributes: ["id", "name", "price", "status"],
      });

      if (!product) return null;

      const productId = product.id;
      const productStatus = product.status;

      // 2. Lấy discount
      const discounts = await ProductDiscount.findAll({
        where: { product_id: productId },
        attributes: ["discount_value"],
      });

      // 3. Lấy detail
      const detail = await ProductDetail.findOne({
        where: { product_id: productId },
        attributes: ["long_description", "origin", "specifications"],
      });

      // 4. Lấy images
      const images = await ProductImage.findAll({
        where: { product_id: productId },
        attributes: ["image_url", "is_main"],
      });

      const mainImage =
        images.find((img) => img.is_main == true)?.image_url || null;

      const subImages = images
        .filter((img) => img.is_main != true)
        ?.map((img) => img.image_url);

      // Base result object
      const result = {
        id: productId,
        isPreOrder:
          productStatus === "pre_order" || productStatus === "coming_soon",
        detail: {
          name: product.name,
          price: formatCurrency(product.price),
          discountedPrice: formatCurrency(
            discounts?.map((d) => d.discount_value)[0]
          ),
          longDescription: detail?.long_description || null,
          origin: detail?.origin || null,
          specifications:
            parseHtmlToBlocks(detail?.specifications.trim()) || null,
        },
        images: {
          mainImage,
          subImages,
        },
      };

      // Xử lý trường hợp preorder/coming_soon
      if (result.isPreOrder) {
        // Debug: Kiểm tra tất cả campaigns
        const allCampaigns = await PreorderCampaign.findAll({
          where: { product_id: productId },
          raw: true,
        });

        // Query chính thức - LẤY CẢ upcoming VÀ open campaigns
        const preorderCampaign = await PreorderCampaign.findOne({
          where: {
            product_id: productId,
            status: ["upcoming", "open"], // Lấy cả 2 status
          },
          attributes: ["id", "start_date", "end_date", "status"],
          include: [
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
              order: [["order_index", "ASC"]],
            },
          ],
        });

        if (preorderCampaign) {
          // KIỂM TRA ĐĂNG KÝ CỦA NGƯỜI DÙNG
          let userRegistration = null;
          let isRegistered = false;

          if (customerId || guestSessionId) {
            isRegistered = await this.checkExistingRegistration(
              customerId,
              guestSessionId,
              productId,
              preorderCampaign.id
            );

            // Nếu đã đăng ký, lấy thông tin đăng ký
            if (isRegistered) {
              userRegistration = await PreorderRegistration.findOne({
                where: {
                  product_id: productId,
                  campaign_id: preorderCampaign.id,
                  ...(customerId
                    ? { customer_id: customerId }
                    : { guest_session_id: guestSessionId }),
                  status: ["pending", "confirmed"],
                },
                attributes: ["id", "status", "tier_id", "created_at"],
              });
            }
          }

          // XÁC ĐỊNH TYPE VÀ DATA THEO STATUS
          const campaignType =
            preorderCampaign.status === "upcoming" ? "upcoming" : "open";

          result.preorder = {
            startDate: formatDate(preorderCampaign.start_date),
            endDate: formatDate(preorderCampaign.end_date),
            status: preorderCampaign.status,
            campaignId: preorderCampaign.id,
            type: campaignType, // THÊM TRƯỜNG TYPE
            isRegistered,

            tiers: await Promise.all(
              preorderCampaign.tiers?.map(async (tier) => {
                // Đếm số slot đã reserved/confirmed cho tier này
                const reservedCount = await PreorderSlot.count({
                  where: {
                    tier_id: tier.id,
                    status: ["reserved", "confirmed"],
                  },
                });

                let tierData = {
                  id: tier.id,
                  name: tier.name,
                  type: tier.type,
                  price: formatCurrency(tier.price),
                  discountPercent: tier.discount_percent,
                  orderIndex: tier.order_index,
                  limitQuantity: tier.limit_quantity,
                };

                // PHÂN BIỆT DATA THEO CAMPAIGN STATUS
                if (preorderCampaign.status === "upcoming") {
                  tierData.soldQuantity = reservedCount; // Dùng PreorderSlot
                } else {
                  tierData.soldQuantity = tier.sold_quantity; // vẫn lấy từ PreorderTier
                }

                return tierData;
              })
            ),
          };
        } else {
          console.log("No preorder campaign found despite debug showing one!");
        }
      }

      return result;
    } catch (error) {
      console.log("Error in getProductBySlug:", error);
      throw error;
    }
  },

  async getProductVariantsBySlug(slug) {
    try {
      const product = await Product.findOne({
        where: { slug },
        include: [
          {
            model: ProductVariant,
            as: "variants",
            attributes: ["id", "name", "sku", "price", "image_url"],
            include: [
              {
                model: AttributeValue,
                as: "attribute_values",
                attributes: ["id", "value"],
                include: [
                  {
                    model: Attribute,
                    as: "attribute",
                    attributes: ["id", "name", "display_order"], // ✅ Thêm display_order
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!product) {
        return { success: false, error: "Product not found", data: null };
      }

      const transformedData = {};
      const attributeOrder = {}; // ✅ Lưu thứ tự của từng attribute

      product.variants.forEach((variant) => {
        variant.attribute_values.forEach((attrValue) => {
          const attrName = attrValue.attribute.name;
          const attrValueName = attrValue.value;
          const displayOrder = attrValue.attribute.display_order; // ✅ Lấy display_order

          // ✅ Lưu display_order cho attribute
          if (!attributeOrder[attrName]) {
            attributeOrder[attrName] = displayOrder;
          }

          if (!transformedData[attrName]) {
            transformedData[attrName] = [];
          }

          // ✅ Kiểm tra nếu giá trị này đã tồn tại thì bỏ qua
          const isExist = transformedData[attrName].some(
            (item) => item.variantValue === attrValueName
          );

          if (!isExist) {
            transformedData[attrName].push({
              productId: product.id,
              variantId: variant.id,
              variantValue: attrValueName,
              priceVariant: formatCurrency(variant.price),
            });
          }
        });
      });

      // ✅ Sắp xếp transformedData theo display_order
      const sortedAttributes = {};
      Object.keys(transformedData)
        .sort((a, b) => {
          const orderA = attributeOrder[a] || 999; // Mặc định 999 nếu không có order
          const orderB = attributeOrder[b] || 999;
          return orderA - orderB;
        })
        .forEach((attrName) => {
          sortedAttributes[attrName] = transformedData[attrName];
        });

      return {
        success: true,
        data: {
          attributes: sortedAttributes, // ✅ Dùng sortedAttributes thay vì transformedData
          variants: product.variants?.map((v) => ({
            id: v.id,
            price: formatCurrency(v.price),
            image: v.image_url,
            attributes: v.attribute_values?.map((a) => a.value),
          })),
        },
      };
    } catch (error) {
      console.error("Error getting product variants by slug:", error);
      return { success: false, error: error.message, data: null };
    }
  },

  async findAll(options = {}) {
    return await Product.findAll(options);
  },

  async findById(id) {
    return await Product.findByPk(id);
  },

  async findBySlug(slug) {
    return await Product.findOne({ where: { slug } });
  },

  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) return null;
    return await product.update(data);
  },

  async delete(id) {
    const product = await Product.findByPk(id);
    if (!product) return null;
    await product.destroy();
    return product;
  },
};

module.exports = productService;
