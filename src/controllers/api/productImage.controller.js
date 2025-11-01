const { success, error } = require("@/utils/response");
const {
  createProductImage,
  deleteProductImage,
  uploadImageForProduct,
  deleteImagesByProduct,
  deleteImageById,
} = require("@/services/productImage.service");
const throwError = require("@/utils/throwError");

const uploadProductImage = async (req, res) => {
  try {
    const { product_id, is_main } = req.body;
    if (!product_id) throwError(400, "Thiếu product_id");

    const image = await createProductImage(
      product_id,
      req.file,
      is_main === "true"
    );

    return success(res, "Upload ảnh sản phẩm thành công", image);
  } catch (err) {
    console.log(err);
    return error(res, err);
  }
};

// Upload ảnh (chính hoặc phụ)
const uploadByProduct = async (req, res) => {
  try {
    console.log("hello");
    console.log("req.file", req.file);
    const { productId } = req.params;
    const isMain = req.body.is_main === "true" || req.body.is_main === true;

    if (!req.file) throwError(400, "Thiếu file upload");

    const image = await uploadImageForProduct(productId, req.file, isMain);
    return success(res, "Upload ảnh thành công", image);
  } catch (err) {
    console.log(err);
    return error(res, err);
  }
};

// Xoá tất cả ảnh theo productId
const deleteAllByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    await deleteImagesByProduct(productId);
    return success(res, `Đã xoá toàn bộ ảnh của sản phẩm ${productId}`);
  } catch (err) {
    console.log(err);
    return error(res, err);
  }
};

const deleteSingleByProduct = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    await deleteImageById(productId, imageId);
    return success(res, `Đã xoá ảnh ${imageId} của sản phẩm ${productId}`);
  } catch (err) {
    console.log(err);
    return error(res, err);
  }
};

const removeProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProductImage(id);
    return success(res, "Xóa ảnh thành công");
  } catch (err) {
    return error(res, err);
  }
};

module.exports = {
  uploadProductImage,
  removeProductImage,
  uploadByProduct,
  deleteAllByProduct,
  deleteSingleByProduct,
};
