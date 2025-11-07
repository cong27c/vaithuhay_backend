const productService = require("@/services/product.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

async function getProduct(req, res) {
  const { slug } = req.params;

  try {
    const productData = await productService.getProductBySlug(
      slug,
      req.user?.id || null,
      req.guestSession?.id || null
    );

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

const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const numericProductId = parseInt(productId);
    const numericLimit = parseInt(limit);

    if (isNaN(numericProductId) || numericProductId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (isNaN(numericLimit) || numericLimit <= 0 || numericLimit > 20) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 20",
      });
    }

    const result = await productService.getRelatedProducts(
      numericProductId,
      numericLimit
    );

    const plainProducts = result.map((p) => {
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        status: p.status,
        image: p.mainImage?.image_url || null,
        discount: p.discount
          ? {
              type: p.discount.discount_type,
              value: p.discount.discount_value,
              status: p.discount.status,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: plainProducts,
      total: plainProducts.length,
      message: "Related products fetched successfully",
    });
  } catch (error) {
    console.log("Error in getRelatedProducts controller:", error);

    if (error.message === "Product not found") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getProduct,
  getProductVariantsBySlug,
  getHighlights,
  getBlogs,
  getRelatedProducts,
};
