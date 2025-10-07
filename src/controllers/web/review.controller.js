// controllers/reviewController.js
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const reviewService = require("@/services/review.service");

const createReview = async (req, res) => {
  try {
    // Lấy userId từ authentication middleware
    const userId = req.user.id;

    // Lấy các fields từ body
    const { title, content, rating, product_id, order_id } = req.body;

    // Validate required fields
    if (!title || !content || !rating || !product_id || !order_id) {
      return throwError(res, 400, "Tất cả các trường là bắt buộc");
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return throwError(res, 400, "Rating phải từ 1 đến 5");
    }

    // Lấy files từ Multer
    const images = req.files?.["images"] || [];
    const video = req.files?.["video"] ? req.files["video"][0] : null;

    console.log("Creating review for user:", userId);

    // Gọi service để tạo review
    const result = await reviewService.createReview(
      {
        title,
        content,
        rating: ratingNum,
        product_id,
        order_id,
        images,
        video,
      },
      userId
    );

    return success(res, 201, result, "Tạo review thành công");
  } catch (err) {
    console.error("Lỗi tạo review:", err);
    return error(res, 500, err.message);
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

module.exports = {
  createReview,
  getAllReviews,
};
