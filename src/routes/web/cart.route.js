const express = require("express");
const router = express.Router();
const cartController = require("@/controllers/web/cart.controller");
const optionalAuth = require("@/middlewares/optionalAuth");

router.post("/add", optionalAuth, cartController.addToCart);
router.get("/my-cart", optionalAuth, cartController.getCartItems);
router.patch(
  "/items/:cartItemId/quantity",
  optionalAuth,
  cartController.updateQuantity
);
router.put(
  "/items/:itemId/variant",
  optionalAuth,
  cartController.updateCartItemVariant
);

router.delete(
  "/items/:cartItemId",
  optionalAuth,
  cartController.removeCartItem
);

module.exports = router;
