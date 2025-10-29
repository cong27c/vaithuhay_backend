const express = require("express");
const router = express.Router();

const collectionController = require("@/controllers/web/collection.controller");
router.get("/slide/:slug", collectionController.getByProductsSlugController);
router.get("/:slug", collectionController.getProductsByCollectionSlug);
router.get("/", collectionController.getCollections);

module.exports = router;
