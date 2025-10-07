const productService = require("@/services/product.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

async function getProduct(req, res) {
  const { slug } = req.params;
  try {
    const productData = await productService.getProductBySlug(slug);

    if (!productData) {
      return throwError(res, 400, "Ko tìm thấy sản phẩm");
    }

    return success(res, 200, productData);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
}

async function getHighlights(req, res) {
  const { productId } = req.params;
  try {
    const highlights = await productService.getProductHighlight(productId);
    return success(res, 200, highlights);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
}

async function getBlogs(req, res) {
  const { productId } = req.params;
  try {
    const blogs = await productService.getProductBlogs(productId);
    return success(res, 200, blogs);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
}

const getProductVariantsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return throwError(400, "Product slug is required");
    }

    const result = await productService.getProductVariantsBySlug(slug);

    if (!result.success) {
      return throwError(404, result.error);
    }

    return success(res, 200, result.data);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getProduct,
  getProductVariantsBySlug,
  getHighlights,
  getBlogs,
};
