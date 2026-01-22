// models/Order.js
class Order {
  constructor({
    orderId,
    userId,
    addressId,
    totalPrice,
    orderStatus,
    paymentStatus,
    createdAt,
  }) {
    this.orderId = orderId;
    this.userId = userId;
    this.addressId = addressId;
    this.totalPrice = totalPrice;
    this.orderStatus = orderStatus;
    this.paymentStatus = paymentStatus;
    this.createdAt = createdAt;
  }
}

module.exports = Order;
