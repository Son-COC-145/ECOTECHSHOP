// routes/orderRoutes.js
const express = require("express");
const OrderController = require("../controllers/OrderController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

// =====================
// USER
// =====================

// Lấy đơn hàng của user đang đăng nhập
router.get("/me", protect, OrderController.getUserOrders);

// Lấy đơn hàng của user theo transaction code
router.get("/by-transaction/:transactionNo", protect, OrderController.getMyOrderByTransaction);

// Tạo đơn hàng
router.post("/", protect, OrderController.createOrder);

// =====================
// ADMIN
// =====================

// ✅ NO-CACHE middleware (chặn 304 cho API thống kê)
const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
};

// ✅ Stats Dashboard (phải đặt trước "/:id")
router.get(
  "/stats",
  protect,
  restrictTo("admin"),
  noCache,
  OrderController.getStats
);

// Doanh thu
router.get(
  "/revenue",
  protect,
  restrictTo("admin"),
  noCache,
  OrderController.getRevenue
);

// ✅ Doanh thu theo thời gian (year/month/day) - PHẢI ĐẶT TRƯỚC "/:id"
router.get(
  "/revenue-by-time",
  protect,
  restrictTo("admin"),
  noCache,
  OrderController.getRevenueByTime
);

// Lấy theo transactionNo
router.get(
  "/transaction/:transactionNo",
  protect,
  restrictTo("admin"),
  OrderController.getOrderByTransaction
);

// Chi tiết đơn hàng (Admin) - phải đặt trước "/"
router.get("/:id", protect, restrictTo("admin"), OrderController.getOrderDetail);

// List orders (Admin) - ✅ phân trang qua query
router.get("/", protect, restrictTo("admin"), OrderController.getOrders);

// Cập nhật trạng thái (Admin)
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  OrderController.updateOrderStatus
);

// Xoá đơn (Admin)
router.delete("/:id", protect, restrictTo("admin"), OrderController.deleteOrder);

module.exports = router;