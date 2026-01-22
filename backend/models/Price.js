class Price {
  constructor({ priceId, productId, optionName, optionPrice, createdAt, updatedAt }) {
    this.priceId = priceId;
    this.productId = productId;
    this.optionName = optionName;
    this.optionPrice = optionPrice;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Price;
