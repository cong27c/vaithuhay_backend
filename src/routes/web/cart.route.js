const express = require("express");
const router = express.Router();
const cartController = require("@/controllers/web/cart.controller");

router.post("/add", cartController.addToCart);
router.get("/my-cart", cartController.getCartItems);
router.patch("/items/:cartItemId/quantity", cartController.updateQuantity);
router.put("/items/:itemId/variant", cartController.updateCartItemVariant);
router.delete("/items/:cartItemId", cartController.removeCartItem);
// Thêm combo vào giỏ hàng
router.post("/combos/add", cartController.addComboToCart);
// Lấy danh sách combo trong giỏ hàng
router.get("/combos", cartController.getCartCombos);
// Cập nhật số lượng combo
router.put("/combos/update", cartController.updateCartComboQuantity);
// Xóa combo khỏi giỏ hàng
router.delete("/combos/:cartItemId", cartController.removeCartCombo);

module.exports = router;
