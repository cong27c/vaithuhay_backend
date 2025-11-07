const express = require("express");
const router = express.Router();
const multer = require("multer");
const productController = require("@/controllers/api/product.controller");
const productImageController = require("@/controllers/api/productImage.controller");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📦 Product CRUD routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Ảnh sản phẩm
router.post(
  "/:productId/images",
  upload.single("file"),
  productImageController.uploadByProduct
);
router.delete("/:productId/images", productImageController.deleteAllByProduct);
router.delete(
  "/:productId/images/:imageId",
  productImageController.deleteSingleByProduct
);

// 🔄 Product Variant routes

router.get("/variants/:id", productController.getVariant);
router.get(
  "/variants/product/:productId",
  productController.getProductVariantsByProduct
);
router.post("/:productId/variants", productController.createProductVariant);
router.put("/variants/:variantId", productController.updateProductVariant);
router.delete("/variants/:variantId", productController.deleteProductVariant);

module.exports = router;
