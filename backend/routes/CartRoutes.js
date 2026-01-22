// backend/routes/CartRoutes.js
const express = require("express");
const CartController = require("../controllers/CartController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Lấy giỏ hàng của user
router.get("/", protect, CartController.getCart);

// Thêm vào giỏ
router.post("/add", protect, CartController.addToCart);

// Tăng/giảm/xoá theo cartItemId (KHÔNG phải productId)
router.post("/increase/:cartItemId", protect, CartController.increaseQuantity);
router.post("/decrease/:cartItemId", protect, CartController.decreaseQuantity);
router.delete("/remove/:cartItemId", protect, CartController.removeFromCart);

// Xóa nhiều items cùng lúc (dùng sau khi tạo đơn hàng)
router.post("/remove-items", protect, CartController.removeItems);

// Xoá sạch giỏ
router.delete("/", protect, CartController.clearCart);

module.exports = router;