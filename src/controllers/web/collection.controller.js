const collectionService = require("@/services/collection.service");
const { success, error } = require("@/utils/response");
const throwError = require("@/utils/throwError");

const getProductsByCollectionSlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || null;
    const products = await collectionService.getProductsByCollectionSlug(
      slug,
      page,
      limit,
      sort
    );
    return success(res, 200, { ...products });
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
};

const getCollections = async (req, res) => {
  try {
    const data = await collectionService.getAllCollections();

    if (!data || data.length === 0) {
      throwError(404, "Không tìm thấy bộ sưu tập nào");
    }

    return success(res, 200, data);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

const getByProductsSlugController = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) throwError(404, "slug not found");

    const data = await collectionService.getByProductsSlug(slug);

    return success(res, 200, data);
  } catch (err) {
    return error(res, err.status || 500, err.message, err.errors);
  }
};

module.exports = {
  getProductsByCollectionSlug,
  getCollections,
  getByProductsSlugController,
};
