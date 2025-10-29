const express = require("express");
const router = express.Router();
const ComboController = require("@/controllers/web/combo.controller");

router.get("/", ComboController.getAllCombos);
router.get("/detail", ComboController.getCombosDetail);
router.get("/:comboId/products", ComboController.getComboProducts);

module.exports = router;
