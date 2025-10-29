const {
  Collection,
  Product,
  ProductDiscount,
  ProductImage,
  ProductDetail,
} = require("@/models");
const formatCurrency = require("@/utils/formatCurrency");

const { format } = require("date-fns");

const getProductsByCollectionSlug = async (slug, page = 1, limit = 8, sort) => {
  try {
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
            as: "collections",
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

    // 🔹 format kết quả
    const products = productsData.map((p) => {
      const discount = p.discount;
      const mainImage = p.images?.[0];
      const originalPrice = Number(p.price);

      // Nếu có discount_value (%)
      let discountedPrice = originalPrice;
      let discountPercent = null;

      if (discount?.discount_value) {
        discountPercent = Number(discount.discount_value);
        discountedPrice = originalPrice * (1 - discountPercent / 100);
      }

      return {
        productId: p.id,
        name: p.name,
        link: p.slug,
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
        discountPercent, // 🔹 thêm phần trăm giảm giá
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

const getByProductsSlug = async (slug) => {
  try {
    // 1️⃣ Lấy collection theo slug
    const collection = await Collection.findOne({ where: { slug } });
    if (!collection) throw new Error("Collection không tồn tại");

    // 2️⃣ Lấy products có trong collection
    const productsData = await Product.findAll({
      include: [
        {
          model: Collection,
          where: { id: collection.id },
          through: { attributes: [] },
          as: "collections",
        },
        {
          model: ProductDiscount,
          as: "discount",
          attributes: ["discount_value"],
        },
        {
          model: ProductImage,
          as: "images",
          attributes: ["image_url", "is_main"],
          where: { is_main: 1 },
          required: false,
        },
        {
          model: ProductDetail,
          as: "detail", // alias nên thống nhất với Product.hasOne(...)
          attributes: ["long_description"],
          required: false,
        },
      ],
    });

    // 3️⃣ Format dữ liệu theo yêu cầu FE
    const products = productsData.map((p) => {
      const originalPrice = Number(p.price);
      const discountPercent = p.discount?.discount_value
        ? Number(p.discount.discount_value)
        : null;

      const discountedPrice = discountPercent
        ? originalPrice * (1 - discountPercent / 100)
        : originalPrice;

      // Fake cứng demo
      const desc = "Có giá bán lẻ khi hàng có sẵn";
      const notification = "Số lượng cực ít";

      return {
        name: p.name,
        image: p.images?.[0]?.image_url || null,
        desc,
        notification,
        slug: p.slug,
        price: formatCurrency(originalPrice),
        sale: discountPercent ? `${discountPercent}%` : null,
        longDescription: p.detail?.long_description || null, // ✅ thêm trường này
      };
    });

    return products;
  } catch (error) {
    console.error("getByProductsSlug Service Error:", error);
    throw error;
  }
};

const getAllCollections = async () => {
  try {
    const collections = await Collection.findAll({
      attributes: ["name", "slug", "thumbnail"],
    });

    const formatted = collections.map((item) => ({
      image: item.thumbnail,
      desc: item.name,
      link: item.slug ? `/collections/${item.slug}` : "/collections",
    }));

    return formatted;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  getProductsByCollectionSlug,
  getAllCollections,
  getByProductsSlug,
};
