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
    console.log("createProduct");
    const productData = req.body;
    console.log("productData", req.body);
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
  deleteProductVariant,
};
