const express = require("express");
const router = express.Router();
const voucherController = require("@/controllers/web/voucher.controller");
const authJWT = require("@/middlewares/authJWT");

router.get("/", voucherController.getVouchers);
router.post("/apply", voucherController.applyVoucher);

module.exports = router;
