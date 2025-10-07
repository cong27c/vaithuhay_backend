const {
  Collection,
  Product,
  ProductDiscount,
  ProductImage,
} = require("@/models");
const formatCurrency = require("@/utils/formatCurrency");

const { format } = require("date-fns");

const getProductsByCollectionSlug = async (slug, page = 1, limit = 8, sort) => {
  try {
    console.log(slug);
    const collection = await Collection.findOne({ where: { slug } });
    if (!collection) {
      throw new Error("Collection không tồn tại");
    }

    const offset = (page - 1) * limit;

    let order = [];
    switch (sort) {
      case "az":
        order = [["name", "ASC"]];
        break;
      case "za":
        order = [["name", "DESC"]];
        break;
      case "newest":
        order = [["created_at", "DESC"]];
        break;
      case "bestseller":
        order = [["stock", "DESC"]]; // cần có cột sold hoặc sales_count
        break;
      case "price_asc":
        order = [["price", "ASC"]];
        break;
      case "price_desc":
        order = [["price", "DESC"]];
        break;
      default:
        order = [];
    }

    const { count: totalCount, rows: productsData } =
      await Product.findAndCountAll({
        include: [
          {
            model: Collection,
            where: { id: collection.id },
            through: { attributes: [] },
          },
          {
            model: ProductDiscount,
            as: "discount",
            attributes: ["discount_value", "end_date"],
          },
          {
            model: ProductImage,
            as: "images",
            attributes: ["image_url", "is_main"],
            where: { is_main: 1 },
            required: false,
          },
        ],
        limit,
        offset,
        order,
      });

    // format kết quả
    const products = productsData.map((p) => {
      const discount = p.discount;
      const mainImage = p.images?.[0];
      const originalPrice = Number(p.price);
      const discountedPrice = discount?.discount_value
        ? Number(discount.discount_value)
        : originalPrice;

      return {
        name: p.name,
        link: p.slug, // thêm slug của product
        date: discount?.end_date
          ? `Chiến dịch kết thúc: ${format(
              new Date(discount.end_date),
              "dd/MM/yyyy"
            )}`
          : null,
        desc: p.description,
        originalPrice: formatCurrency(originalPrice),
        discountedPrice:
          discountedPrice !== originalPrice
            ? formatCurrency(discountedPrice)
            : null,
        image: mainImage ? mainImage.image_url : null,
        show: true,
        variant: "default",
      };
    });

    return { products, totalCount };
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};
module.exports = { getProductsByCollectionSlug };

module.exports = {
  getProductsByCollectionSlug,
};
