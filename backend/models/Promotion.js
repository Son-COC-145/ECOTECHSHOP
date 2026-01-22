class Promotion {
  constructor({ promotionId, code, description, discountPercent, startDate, endDate }) {
    this.promotionId = promotionId;
    this.code = code;
    this.description = description;
    this.discountPercent = discountPercent;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}

module.exports = Promotion;
