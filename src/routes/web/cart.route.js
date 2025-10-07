const express = require("express");
const router = express.Router();
const cartController = require("@/controllers/web/cart.controller");
const authJWT = require("@/middlewares/authJWT");

router.post("/add", authJWT, cartController.addToCart);
router.get("/my-cart", authJWT, cartController.getCartItems);
router.patch(
  "/items/:cartItemId/quantity",
  authJWT,
  cartController.updateQuantity
);
router.delete("/items/:cartItemId", authJWT, cartController.removeCartItem);

module.exports = router;
