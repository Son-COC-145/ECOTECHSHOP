// models/OrderItem.js
class OrderItem {
  constructor({ orderItemId, orderId, productId, quantity, unitPrice }) {
    this.orderItemId = orderItemId;
    this.orderId = orderId;
    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }
}

module.exports = OrderItem;
