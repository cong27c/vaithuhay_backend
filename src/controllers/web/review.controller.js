// controllers/reviewController.js
const { success, error } = require("@/utils/response");
const reviewService = require("@/services/review.service");

const createReview = async (req, res) => {
  try {
    // Lấy thông tin user và guest session từ middleware - ĐÃ SỬA
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSession?.session_id || null;

    // Validate: phải có ít nhất một hình thức xác thực
    if (!userId && !guestSessionId) {
      return error(
        res,
        401,
        "Unauthorized",
        "Vui lòng đăng nhập hoặc có session để đánh giá"
      );
    }

    // Lấy các fields từ body
    const { title, content, rating, product_id, order_id } = req.body;

    // Validate required fields - ĐÃ TỐI ƯU
    const requiredFields = { title, content, rating, product_id, order_id };
    const missingFields = Object.keys(requiredFields).filter(
      (field) => !requiredFields[field]
    );

    if (missingFields.length > 0) {
      return error(
        res,
        400,
        "Thiếu thông tin",
        `Các trường bắt buộc: ${missingFields.join(", ")}`
      );
    }

    // Validate rating - ĐÃ TỐI ƯU
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return error(
        res,
        400,
        "Dữ liệu không hợp lệ",
        "Rating phải là số từ 1 đến 5"
      );
    }

    // Lấy files từ Multer
    const images = req.files?.["images"] || [];
    const video = req.files?.["video"]?.[0] || null;

    console.log(
      `Creating review for: ${
        userId ? `user:${userId}` : `guest:${guestSessionId}`
      }`
    );

    // Gọi service để tạo review - ĐÃ THÊM guestSessionId
    const result = await reviewService.createReview(
      {
        title: title.trim(),
        content: content.trim(),
        rating: ratingNum,
        product_id: parseInt(product_id),
        order_id: parseInt(order_id),
        images,
        video,
      },
      userId,
      guestSessionId // 👈 THÊM guestSessionId
    );

    return success(
      res,
      201,
      result,
      "Tạo đánh giá thành công. Đánh giá của bạn đang chờ duyệt."
    );
  } catch (err) {
    console.error("Lỗi tạo review:", err);

    // Phân loại lỗi để trả về status code phù hợp
    if (err.message.includes("chưa mua") || err.message.includes("đã review")) {
      return error(res, 400, "Không thể đánh giá", err.message);
    }
    if (err.message.includes("không tồn tại")) {
      return error(res, 404, "Không tìm thấy", err.message);
    }

    return error(res, 500, "Lỗi server", err.message);
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await reviewService.getAllReviews();
    return success(res, 200, reviews, "Lấy danh sách reviews thành công");
  } catch (err) {
    console.error("Lỗi lấy reviews:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

// THÊM: Controller cho admin duyệt review
const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;
    const adminId = req.user.id; // Admin user

    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return error(
        res,
        400,
        "Dữ liệu không hợp lệ",
        "Status phải là: pending, approved hoặc rejected"
      );
    }

    const result = await reviewService.updateReviewStatus(
      reviewId,
      status,
      adminId
    );
    return success(
      res,
      200,
      result,
      `Đã ${status === "approved" ? "duyệt" : "từ chối"} review thành công`
    );
  } catch (err) {
    console.error("Lỗi cập nhật review:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

// THÊM: Lấy reviews theo product với phân trang
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await reviewService.getProductReviews(
      parseInt(productId),
      parseInt(page),
      parseInt(limit)
    );

    return success(
      res,
      200,
      result,
      "Lấy danh sách reviews sản phẩm thành công"
    );
  } catch (err) {
    console.error("Lỗi lấy reviews sản phẩm:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

// THÊM: Lấy reviews chờ duyệt (cho admin)
const getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.findAndCountAll({
      where: { status: "pending" },
      include: [
        {
          model: ReviewMedia,
          as: "images",
          order: [["display_order", "ASC"]],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "image"],
        },
        {
          model: Order,
          as: "order",
          attributes: ["id", "order_number"],
        },
      ],
      order: [["created_at", "ASC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return success(
      res,
      200,
      reviews,
      "Lấy danh sách reviews chờ duyệt thành công"
    );
  } catch (err) {
    console.error("Lỗi lấy reviews chờ duyệt:", err);
    return error(res, 500, "Lỗi server", err.message);
  }
};

module.exports = {
  createReview,
  getAllReviews,
  updateReviewStatus,
  getProductReviews,
  getPendingReviews,
};
