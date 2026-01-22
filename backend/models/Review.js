class Review {
  constructor({
    reviewId,
    userId,
    orderId,
    productId,
    rating,
    comment,
    createdAt,
    username
  }) {
    this.reviewId = reviewId;
    this.userId = userId;
    this.orderId = orderId;
    this.productId = productId;
    this.rating = rating;
    this.comment = comment;
    this.createdAt = createdAt;
    this.username = username; // join từ Users
  }
}

module.exports = Review;
