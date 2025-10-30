const express = require("express");
const router = express.Router();
const voucherController = require("@/controllers/api/voucher.controller");
const voucherConditionController = require("@/controllers/api/voucherCondition.controller");

// Voucher routes
router.post(
  "/",

  voucherController.createVoucher
);
router.get(
  "/",

  voucherController.getAllVouchers
);
router.get(
  "/:id",

  voucherController.getVoucherById
);
router.get("/code/:code", voucherController.getVoucherByCode);
router.put(
  "/:id",

  voucherController.updateVoucher
);
router.delete(
  "/:id",

  voucherController.deleteVoucher
);
router.patch(
  "/:id/status",

  voucherController.updateVoucherStatus
);
router.post("/validate/:code", voucherController.validateVoucher);

// Voucher Condition routes (nested)
router.post(
  "/:voucherId/conditions",

  voucherConditionController.createCondition
);
router.get(
  "/:voucherId/conditions",

  voucherConditionController.getVoucherConditions
);
router.put(
  "/conditions/:conditionId",

  voucherConditionController.updateCondition
);
router.delete(
  "/conditions/:conditionId",

  voucherConditionController.deleteCondition
);
router.put(
  "/:voucherId/conditions/bulk",

  voucherConditionController.bulkUpdateConditions
);

module.exports = router;
