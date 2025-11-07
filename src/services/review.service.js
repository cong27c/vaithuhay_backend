require("@/config/pusher");
const {
  Review,
  ReviewMedia,
  Order,
  User,
  Product,
  OrderItem,
} = require("@/models");
const cloudinary = require("@/config/cloudinary");
const streamifier = require("streamifier");
const throwError = require("@/utils/throwError");

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "reviews/images", // 👈 Thư mục riêng cho ảnh review
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// Helper function để upload video lên Cloudinary
const uploadVideoToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "reviews/videos", // 👈 Thư mục riêng cho video review
        resource_type: "video",
        chunk_size: 6000000, // 👈 Tối ưu cho video lớn
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

const reviewService = {
  async createReview(reviewData, userId, guestSessionId = null) {
    const { title, content, rating, product_id, order_id } = reviewData;

    // 👇 Lấy files từ reviewData (multipart/form-data)
    const images = reviewData.images || []; // Array of image files
    const video = reviewData.video || null; // Single video file

    // Start transaction
    const transaction = await Review.sequelize.transaction();

    try {
      // 1. Kiểm tra user có tồn tại không (nếu là logged in user)
      if (userId) {
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
          throw new Error("User không tồn tại");
        }
      }

      // 2. Kiểm tra user/guest có mua sản phẩm này không
      const orderWhere = {
        id: order_id,
        status: "completed",
      };

      // Thêm điều kiện theo user hoặc guest session
      if (userId) {
        orderWhere.customer_id = userId;
      } else if (guestSessionId) {
        orderWhere.guest_session_id = guestSessionId;
      } else {
        throw new Error("Không xác định được người dùng");
      }

      const order = await Order.findOne({
        where: orderWhere,
        include: [
          {
            model: OrderItem,
            as: "items",
            where: { product_id: product_id },
            required: true,
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
      const existingReviewWhere = {
        product_id: product_id,
        order_id: order_id,
      };

      if (userId) {
        existingReviewWhere.user_id = userId;
      } else {
        existingReviewWhere.user_id = null;
      }

      const existingReview = await Review.findOne({
        where: existingReviewWhere,
        transaction,
      });

      if (existingReview) {
        throw new Error("Bạn đã review sản phẩm này rồi");
      }

      // 4. Upload ảnh lên Cloudinary (nếu có)
      const uploadedImages = [];
      if (images && images.length > 0) {
        console.log(`📤 Uploading ${images.length} images to Cloudinary...`);

        for (const image of images) {
          try {
            const uploadResult = await uploadImageToCloudinary(image);
            uploadedImages.push({
              url: uploadResult.secure_url,
              public_id: uploadResult.public_id,
              original_name: image.originalname,
              file_size: image.size,
            });
            console.log(`✅ Image uploaded: ${uploadResult.secure_url}`);
          } catch (uploadError) {
            console.error("❌ Image upload failed:", uploadError);
            throw new Error(`Lỗi upload ảnh: ${uploadError.message}`);
          }
        }
      }

      // 5. Upload video lên Cloudinary (nếu có)
      let uploadedVideo = null;
      if (video) {
        console.log("📤 Uploading video to Cloudinary...");

        try {
          const uploadResult = await uploadVideoToCloudinary(video);
          uploadedVideo = {
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            original_name: video.originalname,
            file_size: video.size,
            duration: uploadResult.duration, // 👈 Cloudinary trả về duration cho video
          };
          console.log(`✅ Video uploaded: ${uploadResult.secure_url}`);
        } catch (uploadError) {
          console.error("❌ Video upload failed:", uploadError);
          throw new Error(`Lỗi upload video: ${uploadError.message}`);
        }
      }

      // 6. Tạo review
      const review = await Review.create(
        {
          title,
          content,
          rating,
          user_id: userId,
          product_id,
          order_id,
          status: "pending",
        },
        { transaction }
      );

      const mediaDocuments = [];
      let displayOrder = 0;

      // 7. Lưu thông tin ảnh vào database
      for (const imageInfo of uploadedImages) {
        const media = await ReviewMedia.create(
          {
            review_id: review.id,
            media_url: imageInfo.url, // 👈 URL từ Cloudinary
            media_type: "image",
            display_order: displayOrder++,
            original_name: imageInfo.original_name,
            file_size: imageInfo.file_size,
            cloudinary_public_id: imageInfo.public_id, // 👈 Lưu public_id để quản lý
          },
          { transaction }
        );
        mediaDocuments.push(media);
      }

      // 8. Lưu thông tin video vào database (nếu có)
      if (uploadedVideo) {
        const videoMedia = await ReviewMedia.create(
          {
            review_id: review.id,
            media_url: uploadedVideo.url, // 👈 URL từ Cloudinary
            media_type: "video",
            display_order: displayOrder++,
            original_name: uploadedVideo.original_name,
            file_size: uploadedVideo.file_size,
            cloudinary_public_id: uploadedVideo.public_id, // 👈 Lưu public_id
            metadata: {
              duration: uploadedVideo.duration, // 👈 Lưu thêm metadata
            },
          },
          { transaction }
        );
        mediaDocuments.push(videoMedia);
      }

      // Commit transaction
      await transaction.commit();

      // 9. Lấy lại review với thông tin đầy đủ
      const reviewWithMedia = await Review.findByPk(review.id, {
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
      });

      console.log(
        `🎉 Review created successfully with ${
          uploadedImages.length
        } images and ${uploadedVideo ? 1 : 0} video`
      );

      return {
        review: reviewWithMedia,
        mediaCount: {
          images: uploadedImages.length,
          video: uploadedVideo ? 1 : 0,
        },
      };
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await transaction.rollback();
      console.error("💥 Review creation failed:", error);
      throw error;
    }
  },

  async getAllReviews() {
    return await Review.findAll({
      include: [
        {
          model: ReviewMedia,
          as: "images", // 👈 SỬA: "media" → "images"
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
      ],
      order: [["created_at", "DESC"]], // 👈 SỬA: "createdAt" → "created_at"
    });
  },

  // THÊM: Service để admin duyệt review
  async updateReviewStatus(reviewId, status, adminId) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error("Review không tồn tại");
    }

    review.status = status;
    review.updated_at = new Date();
    await review.save();

    return review;
  },

  // THÊM: Lấy reviews theo product với phân trang
  async getProductReviews(productId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    return await Review.findAndCountAll({
      where: {
        product_id: productId,
        status: "approved", // Chỉ hiển thị review đã duyệt
      },
      include: [
        {
          model: ReviewMedia,
          as: "images",
          order: [["display_order", "ASC"]],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: limit,
      offset: offset,
    });
  },
};

module.exports = reviewService;
