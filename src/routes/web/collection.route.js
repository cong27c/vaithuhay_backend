const express = require("express");
const router = express.Router();

const collectionController = require("@/controllers/web/collection.controller");

router.get("/:slug", collectionController.getProductsByCollectionSlug);

module.exports = router;
