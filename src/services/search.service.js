// services/SearchService.js
const { Product, Blog, Collection, ProductImage } = require("../models");
const { Op, Sequelize } = require("sequelize");

class SearchService {
  static async searchAll(keyword, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      const numLimit = parseInt(limit);
      const numOffset = parseInt(offset);

      const [products, blogs, collections] = await Promise.all([
        this.searchProducts(keyword, { limit: numLimit, offset: numOffset }),
        this.searchBlogs(keyword, { limit: numLimit, offset: numOffset }),
        this.searchCollections(keyword, { limit: 5, offset: numOffset }),
      ]);

      return {
        success: true,
        data: {
          products: products.items || products.data?.items || [],
          blogs: blogs.items || blogs.data?.items || [],
          collections: collections.items || [],
          totals: {
            products: products.pagination?.total || products.data?.total || 0,
            blogs: blogs.data?.total || 0,
            collections: collections.total || 0,
          },
        },
      };
    } catch (error) {
      console.error("SearchService error:", error);
      return {
        success: false,
        message: `Search failed: ${error.message}`,
      };
    }
  }

  static async searchProducts(keyword, options = {}) {
    const {
      category_id,
      min_price,
      max_price,
      offset,
      page = 1,
      limit,
      sort_by = "created_at",
      sort_order = "DESC",
    } = options;

    try {
      const whereConditions = {};

      if (keyword) {
        whereConditions.name = {
          [Op.like]: `%${keyword}%`,
        };
      }

      if (category_id) {
        whereConditions.category_id = category_id;
      }

      if (min_price !== undefined || max_price !== undefined) {
        whereConditions.price = {};
        if (min_price !== undefined) {
          whereConditions.price[Op.gte] = min_price;
        }
        if (max_price !== undefined) {
          whereConditions.price[Op.lte] = max_price;
        }
      }

      const { count, rows } = await Product.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: ProductImage,
            as: "mainImage",
            attributes: ["image_url"],
            required: false,
          },
        ],
        order: [[sort_by, sort_order]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true,
      });

      const items = rows.map((product) => {
        const productData = product.get({ plain: true });
        return {
          ...productData,
          mainImage: productData.mainImage?.image_url || null,
        };
      });

      return {
        success: true,
        data: {
          items,
          total: count,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Error searching products:", error);
      return {
        success: false,
        message: "Lỗi tìm kiếm sản phẩm",
        error: error.message,
      };
    }
  }

  static async searchBlogs(keyword, options = {}) {
    try {
      const { limit = 10, page = 1, ...otherOptions } = options;

      const whereConditions = {};

      if (keyword) {
        // Build conditions với biến riêng để debug
        const titleCondition = { title: { [Op.like]: `%${keyword}%` } };
        const contentCondition = {
          content_text: { [Op.like]: `%${keyword}%` },
        };
        const authorCondition = { author: { [Op.like]: `%${keyword}%` } };

        const searchCondition = {
          [Op.or]: [titleCondition, contentCondition, authorCondition],
        };

        const typeCondition = {
          type: { [Op.in]: ["setup-decor", "cong-nghe"] },
        };

        const statusCondition = {
          status: "published",
        };

        whereConditions[Op.and] = [
          searchCondition,
          typeCondition,
          statusCondition,
        ];
      }

      // Test 1: Chỉ type và status
      const testCondition1 = {
        type: { [Op.in]: ["setup-decor", "cong-nghe"] },
        status: "published",
      };

      const test1 = await Blog.findAndCountAll({
        where: testCondition1,
        limit: 5,
        attributes: ["id", "title", "type", "status"],
      });

      // Test 2: Thêm keyword đơn giản
      const testCondition2 = {
        [Op.and]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { type: { [Op.in]: ["setup-decor", "cong-nghe"] } },
          { status: "published" },
        ],
      };

      const test2 = await Blog.findAndCountAll({
        where: testCondition2,
        limit: 5,
        attributes: ["id", "title", "type", "status"],
      });

      const blogs = await Blog.findAndCountAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [["created_at", "DESC"]],
        attributes: [
          "id",
          "title",
          "author",
          "slug",
          "thumbnail",
          "content_text",
          "type",
          "created_at",
        ],
        ...otherOptions,
      });

      // Thêm trường link cho mỗi blog
      const blogsWithLinks = blogs.rows.map((blog) => {
        const blogData = blog.toJSON ? blog.toJSON() : blog;
        return {
          ...blogData,
          link: `/blogs/${blogData.type}/${blogData.slug}`,
        };
      });

      console.log(
        `✅ FINAL RESULT: Found ${blogs.count} blogs for keyword: "${keyword}"`
      );

      return {
        success: true,
        data: {
          items: blogsWithLinks,
          total: blogs.count,
        },
      };
    } catch (error) {
      console.error("Search blogs error:", error);
      return {
        success: false,
        message: "Lỗi tìm kiếm blog",
        error: error.message,
      };
    }
  }
  static async searchCollections(keyword, options = {}) {
    const { limit = 5, offset = 0 } = options;

    if (!keyword || keyword.trim().length === 0) {
      return {
        success: true,
        data: {
          items: [],
          total: 0,
        },
      };
    }

    try {
      const searchConditions = {
        [Op.or]: [
          { name: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
        ],
        status: "active",
      };

      const { count, rows } = await Collection.findAndCountAll({
        where: searchConditions,
        attributes: ["id", "name", "slug", "thumbnail", "description"],
        limit: parseInt(limit),
        offset: parseInt(offset),
        subQuery: false,
      });

      return {
        success: true,
        data: {
          items: rows,
          total: count,
        },
      };
    } catch (error) {
      console.error("Collection search error:", error);
      return {
        success: false,
        message: "Lỗi tìm kiếm collection",
        error: error.message,
      };
    }
  }

  static async getHotTopics() {
    try {
      const popularCollections = await Collection.findAll({
        where: { status: "active" },
        limit: 9,
        order: [["id", "DESC"]],
        attributes: ["name", "slug"],
        subQuery: false,
      });

      return popularCollections.map(
        (collection) => `#${collection.name.replace(/\s+/g, "")}`
      );
    } catch (error) {
      console.error("Hot topics error:", error);
      return [
        "#UPGEN",
        "#ShopeeMall",
        "#LazadaMall",
        "#GócLàmViệc",
        "#ĐènRGB",
        "#PreOrder",
        "#SángTạo",
        "#NO_RESTOCK",
        "#SànPhẩmMới",
      ];
    }
  }
}

module.exports = SearchService;
