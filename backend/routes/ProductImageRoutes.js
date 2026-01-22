const express = require("express");
const router = express.Router();
const ProductImageController = require("../controllers/ProductImageController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Lấy ảnh theo product (có thể public hoặc cần auth tùy yêu cầu)
// ✅ Cho phép public để frontend có thể load ảnh
router.get("/:productId", ProductImageController.getByProduct);

// Admin thêm ảnh
router.post("/", protect, restrictTo("admin"), ProductImageController.create);

// Admin cập nhật ảnh
router.put("/:imageId", protect, restrictTo("admin"), ProductImageController.update);

// Admin xóa ảnh
router.delete("/:imageId", protect, restrictTo("admin"), ProductImageController.delete);

module.exports = router;
