const express = require("express");
const router = express.Router();
const addressController = require("@/controllers/web/address.controller");

router.post("/", addressController.createAddress);
router.get("/", addressController.getAddresses);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);

module.exports = router;
