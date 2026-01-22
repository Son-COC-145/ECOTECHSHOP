class ProductSummary {
  constructor({
    summaryId,
    productId,
    summary,
    wordFreq,
    totalReviews,
    lastUpdated
  }) {
    this.summaryId = summaryId;
    this.productId = productId;
    this.summary = summary;
    this.wordFreq = wordFreq;
    this.totalReviews = totalReviews;
    this.lastUpdated = lastUpdated;
  }
}

module.exports = ProductSummary;
