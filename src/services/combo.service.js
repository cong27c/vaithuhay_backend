const {
  Combo,
  ComboImage,
  ComboImageHotspot,
  Product,
  ProductImage,
  ComboProduct,
  ProductDiscount,
} = require("@/models");
const formatCurrency = require("@/utils/formatCurrency");
const parseHtmlToBlocks = require("@/utils/parseHtmlToBlocks");
const throwError = require("@/utils/throwError");
const { Op } = require("sequelize");

class ComboService {
  static async getAllCombosWithDetails() {
    try {
      const combos = await Combo.findAll({
        attributes: [
          "id",
          "name",
          "author",
          "description",
          "is_active",
          "discount_value",
        ],
        where: { is_active: true },
        include: [
          {
            model: ComboImage,
            as: "images",
            attributes: [
              "id",
              "image_url",
              "main_image",
              "image_type",
              "is_active",
            ],
            where: { is_active: true },
            required: false,
            include: [
              {
                model: ComboImageHotspot,
                as: "hotspots",
                attributes: [
                  "top_position",
                  "left_position",
                  "link_url",
                  "product_id",
                  "is_active",
                ],
                where: { is_active: true },
                required: false,
                include: [
                  {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "price"],
                    include: [
                      {
                        model: ProductImage,
                        as: "mainImage",
                        attributes: ["image_url"],
                        required: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!combos || combos.length === 0) {
        throwError(404, "No combos found");
      }

      // Format từng combo
      const formattedCombos = combos?.map((combo) => {
        const comboData = combo.toJSON();

        // Parse description sang blocks
        const description = parseHtmlToBlocks(comboData.description);

        // Lấy mainImage
        const mainImage =
          comboData.images?.find((img) => img.main_image)?.image_url ||
          comboData.images?.[0]?.image_url ||
          null;

        // Lấy subImage
        const subImage =
          comboData.images
            ?.filter((img) => !img.main_image)
            ?.map((img) => img.image_url) || [];

        // Lấy btnLink từ hotspots
        const btnLink = [];
        comboData.images?.forEach((img) => {
          img.hotspots?.forEach((hotspot) => {
            btnLink.push({
              top_position: hotspot.top_position,
              left_position: hotspot.left_position,
              link_url: hotspot.link_url,
              priceBtn: hotspot.product?.price || null,
              ImageBtn: hotspot.product?.mainImage?.image_url || null,
            });
          });
        });

        return {
          combo_id: comboData.id,
          name: comboData.name,
          author: comboData.author,
          description,
          mainImage,
          subImage,
          btnLink,
          discountCombo: comboData.discount_value
            ? `${Number(comboData.discount_value)}`
            : null,
        };
      });

      return formattedCombos;
    } catch (error) {
      if (error.status) throw error;
      throwError(500, `Error getting combos details: ${error.message}`);
    }
  }

  static formatComboResponse(combo) {
    const mainImageObj = combo.images.find((img) => img.main_image === true);
    const mainImage = mainImageObj ? mainImageObj.image_url : null;

    const subImage = combo.images
      .filter((img) => !img.main_image && img.image_type === "gallery")
      ?.map((img) => img.image_url);

    let btnLink = [];
    if (mainImageObj && mainImageObj.hotspots) {
      btnLink = mainImageObj.hotspots?.map((hotspot) => {
        const product = hotspot.product;
        const priceBtn = product ? product.price : null;
        const nameBtn = product ? product.name : null;
        const ImageBtn =
          product && product.mainImage ? product.mainImage.image_url : null;

        return {
          top_position: hotspot.top_position,
          left_position: hotspot.left_position,
          link_url: hotspot.link_url,
          priceBtn,
          ImageBtn,
          nameBtn,
        };
      });
    }

    return {
      combo_id: combo.id,
      name: combo.name,
      author: combo.author,
      description: parseHtmlToBlocks(combo.description),
      mainImage,
      subImage,
      btnLink,
    };
  }

  static async getAllCombos() {
    try {
      const combos = await Combo.findAll({
        attributes: ["id", "name", "author", "description", "style"],
        where: { is_active: true },
        include: [
          {
            model: ComboImage,
            as: "images",
            attributes: ["image_url", "main_image"],
            where: { is_active: true },
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return combos?.map((combo) => {
        const mainImageObj = combo.images.find(
          (img) => img.main_image === true
        );
        const mainImage = mainImageObj ? mainImageObj.image_url : null;

        return {
          combo_id: combo.id,
          image: mainImage,
          variant: "alternative",
        };
      });
    } catch (error) {
      throwError(500, `Error getting all combos: ${error.message}`);
    }
  }

  static async getActiveCombos({ page, limit, author, style }) {
    try {
      const offset = (page - 1) * limit;

      const whereCondition = { is_active: true };

      if (author) {
        whereCondition.author = author;
      }

      if (style) {
        whereCondition.style = style;
      }

      const { count, rows: combos } = await Combo.findAndCountAll({
        attributes: ["id", "name", "author", "description", "style"],
        where: whereCondition,
        include: [
          {
            model: ComboImage,
            as: "images",
            attributes: ["image_url", "main_image"],
            where: { is_active: true },
            required: false,
          },
        ],
        limit,
        offset,
        order: [["created_at", "DESC"]],
      });

      const formattedCombos = combos?.map((combo) => {
        const mainImageObj = combo.images.find(
          (img) => img.main_image === true
        );
        const mainImage = mainImageObj ? mainImageObj.image_url : null;

        return {
          id: combo.id,
          name: combo.name,
          author: combo.author,
          description: combo.description,
          style: combo.style,
          mainImage,
        };
      });

      return {
        combos: formattedCombos,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      throwError(500, `Error getting active combos: ${error.message}`);
    }
  }

  static async getProductsByCombo(comboId) {
    try {
      const combo = await Combo.findByPk(comboId, {
        include: [
          {
            model: ComboProduct,
            as: "products",
            include: [
              {
                model: Product,
                as: "product",
                include: [
                  {
                    model: ProductDiscount,
                    as: "discount",
                    where: {
                      status: "active",
                      start_date: { [Op.lte]: new Date() },
                      end_date: { [Op.gte]: new Date() },
                    },
                    required: false,
                  },
                  {
                    model: ProductImage,
                    as: "mainImage",
                    attributes: ["image_url"],
                    required: false,
                  },
                ],
                attributes: ["id", "name", "price"],
              },
            ],
          },
        ],
      });

      if (!combo) {
        throw new Error("Combo not found");
      }

      // ✅ Xử lý dữ liệu, thêm original_price và final_price
      const products = combo.products?.map((comboProduct) => {
        const product = comboProduct.product;
        let originalPrice = parseFloat(product.price) || 0;
        let finalPrice = originalPrice;

        // ✅ Nếu có discount hợp lệ
        if (product.discount) {
          const discount = product.discount;
          const discountValue = parseFloat(discount.discount_value) || 0;

          if (discount.discount_type === "percent") {
            finalPrice = originalPrice * (1 - discountValue / 100);
          } else if (discount.discount_type === "fixed") {
            finalPrice = Math.max(originalPrice - discountValue, 0);
          }
        }

        return {
          product_id: product.id,
          name: product.name,
          original_price: formatCurrency(originalPrice), // Giá gốc
          final_price: formatCurrency(finalPrice),
          main_image: product.mainImage ? product.mainImage.image_url : null,
          quantity: comboProduct.quantity,
          display_order: comboProduct.display_order,
          has_discount: product.discount !== null, // Có đang được giảm giá không
        };
      });

      return {
        combo_id: combo.id,
        combo_name: combo.name,
        products: products.sort((a, b) => a.display_order - b.display_order),
      };
    } catch (error) {
      throw new Error(`Error fetching combo products: ${error.message}`);
    }
  }
}

module.exports = ComboService;
