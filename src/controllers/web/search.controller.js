// controllers/searchController.js
const SearchService = require("@/services/search.service");

const searchController = {
  async search(req, res) {
    try {
      const { q: keyword, type, page = 1, limit = 10 } = req.query;

      if (!keyword || keyword.trim().length < 2) {
        return res.json({
          success: true,
          data: {
            products: { items: [], total: 0 },
            blogs: { items: [], total: 0 },
            collections: { items: [], total: 0 },
          },
        });
      }

      const offset = (page - 1) * limit;
      console.log("type", type);

      let results;
      if (type === "products") {
        results = {
          products: await SearchService.searchProducts(keyword, {
            limit,
            offset,
          }),
          blogs: { items: [], total: 0 },
          collections: { items: [], total: 0 },
        };
      } else if (type === "blogs") {
        results = {
          products: { items: [], total: 0 },
          blogs: await SearchService.searchBlogs(keyword, { limit, offset }),
          collections: { items: [], total: 0 },
        };
      } else {
        results = await SearchService.searchAll(keyword, { limit, offset });
      }

      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: Object.values(results).reduce(
            (sum, result) => sum + result.total,
            0
          ),
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi tìm kiếm",
        error: error.message,
      });
    }
  },

  async getHotTopics(req, res) {
    try {
      const hotTopics = await SearchService.getHotTopics();
      res.json({
        success: true,
        data: hotTopics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy chủ đề hot",
      });
    }
  },
};

module.exports = searchController;
