const express = require("express");
const router = express.Router();
const productController = require("@/controllers/web/product.controller");

router.get("/:slug", productController.getProduct);

router.get("/:productId/highlights", productController.getHighlights);

router.get("/:productId/blogs", productController.getBlogs);

router.get("/:slug/variants", productController.getProductVariantsBySlug);

module.exports = router;
