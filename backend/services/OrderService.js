// services/OrderService.js
const OrderDAO = require("../dao/OrderDAO");
const OrderItemService = require("./OrderItemService");

class OrderService {
  async getUserOrders(userId) {
    const orders = await OrderDAO.getByUser(userId);

    const result = [];
    for (const o of orders) {
      const items = await OrderItemService.getItems(o.orderId);
      result.push({ ...o, items });
    }

    return result; 
  }

  // ✅ ADMIN: phân trang (mặc định 100)
  async getAllOrders({ page = 1, limit = 100, status = "All" } = {}) {
    const p = Number(page) || 1;
    const l = Number(limit) || 100;

    const { orders, total } = await OrderDAO.getAllPaginated({ page: p, limit: l, status });
    const totalPages = Math.max(1, Math.ceil(total / l));

    return { orders, total, page: p, limit: l, totalPages };
  }

  async getById(id) {
    const order = await OrderDAO.getById(id);
    if (!order) return null;

    const items = await OrderItemService.getItems(order.orderId);
    return { order, items };
  }

  async createOrder({ userId, items, totalPrice, transactionId, address, addressId }) {
    if (!userId) throw new Error("Thiếu userId");
    if (!Array.isArray(items) || items.length === 0) throw new Error("Thiếu items khi tạo đơn hàng");
    if (totalPrice == null) throw new Error("Thiếu totalPrice");

    const formattedItems = items.map((i) => ({
      productId: i.productId,
      productPriceId: i.productPriceId || null,
      productImageId: i.productImageId || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice || i.price,
    }));

    const orderId = await OrderDAO.createOrder(
      {
        userId,
        totalPrice,
        address,
        addressId,
        orderStatus: "Pending",
        paymentStatus: "Unpaid",
      },
      formattedItems,
      transactionId
    );

    return orderId;
  }

  async deleteOrder(id) {
    return OrderDAO.delete(id);
  }

  async updateStatus(id, status) {
    return OrderDAO.updateStatus(id, status);
  }

  async getByTransactionCode(code) {
    const order = await OrderDAO.getByTransactionCode(code);
    if (!order) return null;

    const items = await OrderItemService.getItems(order.orderId);
    return { order, items };
  }

  async getByTransaction(code) {
    return this.getByTransactionCode(code);
  }

  // ✅ Doanh thu
  async getRevenue(startDate, endDate) {
    return OrderDAO.getRevenue(startDate, endDate);
  }

  // ✅ Stats cho dashboard
  async getStats(startDate, endDate) {
    return OrderDAO.getStats(startDate, endDate);
  }

  // ✅ Revenue series: year/month/day
  async getRevenueByTime(params) {
    return OrderDAO.getRevenueByTime(params);
  }
}

module.exports = new OrderService();
