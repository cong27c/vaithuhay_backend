const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");
const productService = require("@/services/productAdmin.service");
const { uploadImageForProduct } = require("@/services/productImage.service");

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;
    const result = await productService.getAllProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      category,
    });
    return success(res, 200, result, "Products retrieved successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    return success(res, 200, product, "Product retrieved successfully");
  } catch (err) {
    console.log(err);
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = await productService.createProduct(productData);
    return success(res, 201, newProduct, "Product created successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    const updatedProduct = await productService.updateProduct(id, productData);
    return success(res, 200, updatedProduct, "Product updated successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    return success(res, 200, null, "Product deleted successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const getVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAttributes, includeProduct } = req.query;

    const variant = await productService.getProductVariant(parseInt(id), {
      includeAttributes: includeAttributes === "true",
      includeProduct: includeProduct === "true",
    });

    res.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProductVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId || isNaN(parseInt(productId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const options = {
      includeAttributes: req.query.includeAttributes === "true",
      includeProduct: req.query.includeProduct === "true",
    };

    const variants = await productService.getProductVariantsByProduct(
      parseInt(productId),
      options
    );

    res.status(200).json({
      success: true,
      data: variants,
      message: "Product variants retrieved successfully",
    });
  } catch (error) {
    console.error("Get product variants error:", error);

    if (error.message.includes("No product variants found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createProductVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const variantData = req.body;
    const variant = await productService.createProductVariant(
      productId,
      variantData
    );
    return success(res, 201, variant, "Product variant created successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const updateProductVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const variantData = req.body;
    const variant = await productService.updateProductVariant(
      variantId,
      variantData
    );
    return success(res, 200, variant, "Product variant updated successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const deleteProductVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    await productService.deleteProductVariant(variantId);
    return success(res, 200, null, "Product variant deleted successfully");
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductVariant,
  updateProductVariant,
  getVariant,
  deleteProductVariant,
  getProductVariantsByProduct,
};
