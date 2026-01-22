class CartItem {
  constructor(r) {
    this.cartItemId = r.cartItemId;
    this.cartId = r.cartId;
    this.productId = r.productId;
    this.quantity = r.quantity;
    this.price = r.price;

    // từ Product
    this.productName = r.productName;
    this.image = r.image;
    this.productPrices = r.productPrices;  // JSON prices

    // từ Category
    this.categoryName = r.categoryName;
  }
}

module.exports = CartItem;
