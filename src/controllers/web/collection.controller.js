const collectionService = require("@/services/collection.service");
const { success, error } = require("@/utils/response");

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

module.exports = {
  getProductsByCollectionSlug,
};
