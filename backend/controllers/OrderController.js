// controllers/OrderController.js
const OrderService = require("../services/OrderService");

const OrderController = {
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const orders = await OrderService.getUserOrders(userId);
      return res.json({ success: true, orders });
    } catch (e) {
      console.error("getUserOrders error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async getOrders(req, res) {
  try {
    const { page = 1, limit = 100, status = "All" } = req.query;
    const result = await OrderService.getAllOrders({ 
      page: Number(page), 
      limit: Number(limit), 
      status 
    });
    
    res.json({
      success: true,
      orders: result.orders || [],
      total: result.total || 0,
      page: result.page || 1,
      limit: result.limit || 100,
      totalPages: result.totalPages || 1
    });
  } catch (err) {
    console.error("getOrders error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message,
      orders: [],
      total: 0
    });
  }
},

  async getOrderDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ"
      });
    }

    const result = await OrderService.getById(Number(id));
    
    if (!result || !result.order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    res.json({
      success: true,
      order: result.order,
      items: result.items || []
    });
  } catch (err) {
    console.error("getOrderDetail error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
},

  async createOrder(req, res) {
    try {
      const userId = req.user.id;

      const orderId = await OrderService.createOrder({
        userId,
        ...req.body,
      });

      return res.status(201).json({ success: true, orderId });
    } catch (e) {
      console.error("createOrder error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async deleteOrder(req, res) {
    try {
      const orderId = Number(req.params.id);
      if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
      }

      await OrderService.deleteOrder(orderId);
      return res.json({ success: true, message: "Xóa đơn hàng thành công" });
    } catch (e) {
      console.error("deleteOrder error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async updateOrderStatus(req, res) {
    try {
      const orderId = Number(req.params.id);
      const { status } = req.body;

      if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
      }
      if (!status) {
        return res.status(400).json({ success: false, message: "Thiếu status" });
      }

      await OrderService.updateStatus(orderId, status);
      return res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (e) {
      console.error("updateOrderStatus error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async getOrderByTransaction(req, res) {
    try {
      const { transactionNo } = req.params;
      if (!transactionNo) {
        return res.status(400).json({ success: false, message: "Thiếu transactionNo" });
      }

      const result = await OrderService.getByTransactionCode(transactionNo);
      if (!result) {
        return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
      }

      return res.json({ success: true, ...result });
    } catch (e) {
      console.error("getOrderByTransaction error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // User: Lấy đơn hàng của chính họ theo transaction code
  async getMyOrderByTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { transactionNo } = req.params;
      if (!transactionNo) {
        return res.status(400).json({ success: false, message: "Thiếu transactionNo" });
      }

      const result = await OrderService.getByTransactionCode(transactionNo);
      if (!result) {
        return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
      }

      // Kiểm tra xem đơn hàng có thuộc về user này không
      if (result.order && result.order.userId !== userId) {
        return res.status(403).json({ success: false, message: "Bạn không có quyền xem đơn hàng này" });
      }

      // Format response để PaymentSuccess.jsx hiểu được
      // PaymentSuccess expect: { items, totalPrice/total, address }
      return res.json({
        success: true,
        items: result.items || [],
        total: result.order?.totalPrice || 0,
        totalPrice: result.order?.totalPrice || 0,
        address: result.order ? {
          fullName: result.order.fullName,
          phone: result.order.phone,
          province: result.order.province,
          district: result.order.district,
          ward: result.order.ward,
          detail: result.order.detail,
          address: result.order.detail && result.order.ward && result.order.district && result.order.province
            ? `${result.order.detail}, ${result.order.ward}, ${result.order.district}, ${result.order.province}`
            : null
        } : null,
        order: result.order
      }); 
    } catch (e) {
      console.error("getMyOrderByTransaction error:", e); 
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async getRevenue(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const revenue = await OrderService.getRevenue(startDate, endDate);
      return res.json({ success: true, ...revenue });
    } catch (e) {
      console.error("getRevenue error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await OrderService.getStats(startDate, endDate);
      return res.json({ success: true, ...stats });
    } catch (e) {
      console.error("getStats error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // ✅ NEW: series theo year/month/day để vẽ chart
  async getRevenueByTime(req, res) {
    try {
      const { type = "month", year, month } = req.query;

      const data = await OrderService.getRevenueByTime({
        type,
        year: year != null ? Number(year) : undefined,
        month: month != null ? Number(month) : undefined,
      });

      return res.json({ success: true, data });
    } catch (e) {
      console.error("getRevenueByTime error:", e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};

module.exports = OrderController;