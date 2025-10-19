const blogService = require("@/services/blog.service");
const { success, error } = require("@/utils/response");

const getBlogByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!type) {
      return error(res, 400, "Type là bắt buộc");
    }

    // Validate type value against allowed types
    const allowedTypes = ["setup-decor", "product", "cong-nghe"];
    if (!allowedTypes.includes(type)) {
      return error(res, 400, "Type không hợp lệ");
    }

    // Validate page and limit
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return error(res, 400, "Page phải là số lớn hơn 0");
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return error(res, 400, "Limit phải là số từ 1 đến 100");
    }

    const result = await blogService.getBlogByType(type, pageNum, limitNum);

    if (!result.success) {
      return error(res, 500, result.message);
    }

    return success(
      res,
      200,
      {
        blogs: result.data,
        pagination: result.pagination,
      },
      result.message
    );
  } catch (err) {
    console.error("Error in getBlogByType controller:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throwError(400, "Slug là bắt buộc");
    }

    const result = await blogService.getBlogBySlug(slug);
    return success(res, 200, result);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getBlogBySlug,
  getBlogByType,
};
