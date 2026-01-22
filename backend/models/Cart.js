class Cart {
  constructor({ cartId, userId, createdAt }) {
    this.cartId = cartId;
    this.userId = userId;
    this.createdAt = createdAt;
  }
}

module.exports = Cart;
