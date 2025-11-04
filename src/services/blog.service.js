const { Blog } = require("@/models");
const formatDate = require("@/utils/formatDate");
const throwError = require("@/utils/throwError");

const getBlogByType = async (type, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.findAll({
        where: { type, status: "published" },
        attributes: [
          "title",
          "slug",
          "author",
          "content_html",
          "thumbnail",
          "created_at",
        ],
        order: [["created_at", "DESC"]],
        limit: limit,
        offset: offset,
        raw: true,
      }),
      Blog.count({
        where: { type, status: "published" },
      }),
    ]);

    // Format lại created_at
    const formattedBlogs = blogs?.map((blog) => ({
      ...blog,
      created_at: formatDate(blog.created_at),
    }));

    const totalPages = Math.ceil(totalBlogs / limit);

    return {
      success: true,
      data: formattedBlogs,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalBlogs,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      message: "Lấy danh sách blog thành công",
    };
  } catch (error) {
    console.error("Error in getBlogByType service:", error);
    return {
      success: false,
      message: "Lỗi khi lấy danh sách blog",
      error: error.message,
    };
  }
};

// Hàm format date

const getBlogBySlug = async (slug) => {
  try {
    const blog = await Blog.findOne({
      where: { slug, status: "published" },
      attributes: [
        "title",
        "slug",
        "author",
        "content_html",
        "thumbnail",
        "created_at",
      ],
    });

    if (!blog) {
      throwError(404, "Blog không tồn tại");
    }

    return blog;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = {
  getBlogByType,
  getBlogBySlug,
};
