// services/OrderItemService.js
const OrderItemDAO = require("../dao/OrderItemDAO");

/**
 * Service mỏng để làm việc với OrderItem
 * - Lấy items của 1 order: join đủ Product, Category, ProductPrice, ProductImage
 */
class OrderItemService {
  async getItems(orderId) {
    return OrderItemDAO.getByOrder(orderId);
  }
}

module.exports = new OrderItemService();
