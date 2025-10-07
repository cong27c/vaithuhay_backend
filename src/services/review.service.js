const { Review, ReviewMedia, Order, User, Product } = require("@/models");

const reviewService = {
  async createReview(reviewData, userId) {
    console.log("hello");
    const { title, content, rating, product_id, order_id, images, video } =
      reviewData;

    // Start transaction
    const transaction = await Review.sequelize.transaction();

    try {
      // 1. Kiểm tra user có tồn tại không
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error("User không tồn tại");
      }

      // 2. Kiểm tra user có mua sản phẩm này không
      const order = await Order.findOne({
        where: {
          id: order_id,
          user_id: userId,
          status: "completed", // Chỉ cho phép review đơn hàng đã hoàn thành
        },
        include: [
          {
            model: Product,
            as: "products",
            where: { id: product_id },
          },
        ],
        transaction,
      });

      if (!order) {
        throw new Error(
          "Bạn chưa mua sản phẩm này hoặc đơn hàng chưa hoàn thành"
        );
      }

      // 3. Kiểm tra đã review sản phẩm này chưa
      const existingReview = await Review.findOne({
        where: {
          user_id: userId,
          product_id: product_id,
          order_id: order_id,
        },
        transaction,
      });

      if (existingReview) {
        throw new Error("Bạn đã review sản phẩm này rồi");
      }

      // 4. Tạo review
      const review = await Review.create(
        {
          title,
          content,
          rating,
          user_id: userId,
          product_id,
          order_id,
        },
        { transaction }
      );

      const mediaDocuments = [];
      let displayOrder = 0;

      // 5. Xử lý images
      for (const image of images || []) {
        const media = await ReviewMedia.create(
          {
            review_id: review.id,
            media_url: `/uploads/images/${image.filename}`,
            media_type: "image",
            display_order: displayOrder++,
            original_name: image.originalname,
            file_size: image.size,
          },
          { transaction }
        );
        mediaDocuments.push(media);
      }

      // 6. Xử lý video (nếu có)
      if (video) {
        const videoMedia = await ReviewMedia.create(
          {
            review_id: review.id,
            media_url: `/uploads/videos/${video.filename}`,
            media_type: "video",
            display_order: displayOrder++,
            original_name: video.originalname,
            file_size: video.size,
          },
          { transaction }
        );
        mediaDocuments.push(videoMedia);
      }

      // Commit transaction
      await transaction.commit();

      // 7. Lấy lại review với thông tin đầy đủ
      const reviewWithMedia = await Review.findByPk(review.id, {
        include: [
          {
            model: ReviewMedia,
            as: "media",
            order: [["display_order", "ASC"]],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"], // Chỉ lấy thông tin cần thiết
          },
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "image"],
          },
        ],
      });

      return {
        review: reviewWithMedia,
        mediaCount: {
          images: images?.length || 0,
          video: video ? 1 : 0,
        },
      };
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await transaction.rollback();
      throw error;
    }
  },

  async getAllReviews() {
    return await Review.findAll({
      include: [
        {
          model: ReviewMedia,
          as: "media",
          order: [["display_order", "ASC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },
};
module.exports = reviewService;
