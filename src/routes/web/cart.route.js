const express = require("express");
const router = express.Router();
const cartController = require("@/controllers/web/cart.controller");

router.post("/add", cartController.addToCart);
router.get("/my-cart", cartController.getCartItems);
router.patch("/items/:cartItemId/quantity", cartController.updateQuantity);
router.put("/items/:itemId/variant", cartController.updateCartItemVariant);

router.delete("/items/:cartItemId", cartController.removeCartItem);

module.exports = router;
