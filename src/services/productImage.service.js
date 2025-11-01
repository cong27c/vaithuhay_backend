const { ProductImage } = require("@/models");
const cloudinary = require("@/config/cloudinary");
const streamifier = require("streamifier");
const throwError = require("@/utils/throwError");

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "products",
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
// 🖼️ Upload ảnh cho sản phẩm
const uploadImageForProduct = async (productId, file, isMain) => {
  try {
    console.log("📤 Uploading to Cloudinary from buffer...");

    // Upload từ buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "products",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Ghi buffer vào stream
      uploadStream.end(file.buffer);
    });

    console.log("✅ Cloudinary upload success:", uploadResult.secure_url);

    const newImage = await ProductImage.create({
      product_id: productId,
      image_url: uploadResult.secure_url,
      is_main: isMain,
    });

    return newImage;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw error;
  }
};
// 🗑️ Xoá tất cả ảnh theo productId
const deleteImagesByProduct = async (productId) => {
  const images = await ProductImage.findAll({
    where: { product_id: productId },
  });

  for (const image of images) {
    const publicId = extractPublicId(image.image_url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  await ProductImage.destroy({ where: { product_id: productId } });
};

// 🗑️ Xoá 1 ảnh cụ thể theo imageId
const deleteImageById = async (productId, imageId) => {
  const image = await ProductImage.findOne({
    where: { id: imageId, product_id: productId },
  });

  if (!image) throwError(404, "Ảnh không tồn tại");

  const publicId = extractPublicId(image.image_url);
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }

  await ProductImage.destroy({ where: { id: imageId } });
};

// 🔧 Hàm tiện ích để lấy public_id từ URL Cloudinary
const extractPublicId = (url) => {
  try {
    const parts = url.split("/");
    const fileName = parts[parts.length - 1];
    return fileName.split(".")[0]; // lấy phần public_id trước .jpg
  } catch {
    return null;
  }
};
// 🧩 Tạo ảnh sản phẩm mới
const createProductImage = async (productId, file, isMain = false) => {
  if (!file) throwError(400, "Thiếu file upload");

  const result = await uploadImageToCloudinary(file);

  const image = await ProductImage.create({
    product_id: productId,
    image_url: result.secure_url,
    is_main: isMain,
  });

  return image;
};

// ❌ Xóa ảnh Cloudinary + database
const deleteProductImage = async (imageId) => {
  const image = await ProductImage.findByPk(imageId);
  if (!image) throwError(404, "Ảnh không tồn tại");

  // Lấy public_id từ URL Cloudinary (ví dụ: products/abc123)
  const publicId = image.image_url
    .split("/")
    .slice(-2)
    .join("/")
    .replace(/\.[^/.]+$/, "");

  await cloudinary.uploader.destroy(publicId);

  await image.destroy();
  return true;
};

module.exports = {
  createProductImage,
  deleteProductImage,
  uploadImageForProduct,
  deleteImagesByProduct,
  deleteImageById,
};
