const ReviewService = require('../services/ReviewService');

class ReviewController {
  static async createOrUpdateReview(req, res) {
    try {
      const { productId, orderId, rating, comment } = req.body;
      const userId = req.user.id;

      // Validation input
      if (!productId || !orderId || !rating) {
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu thông tin bắt buộc (productId, orderId, rating)' 
        });
      }

      const result = await ReviewService.createOrUpdateReview({
        userId,
        orderId,
        productId,
        rating,
        comment: comment || ''
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error("createOrUpdateReview error:", err);
      res.status(500).json({ success: false, message: err.message || 'Lỗi server khi tạo đánh giá' });
    }
  }

  static async getReviewByOrderAndProduct(req, res) {
    try {
      const { orderId, productId } = req.params;
      const userId = req.user.id;

      const review = await ReviewService.getReviewForOrder({ userId, orderId, productId });

      if (!review)
        return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

      res.json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getReviewsByProduct(req, res) {
    try {
      const { productId } = req.params;
      const reviews = await ReviewService.getByProduct(productId);

      res.json({ success: true, reviews });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getReviewByUserProduct(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      const review = await ReviewService.getReviewByUserProduct({ userId, productId });

      if (!review)
        return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

      res.json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteReviewById(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.id;

      await ReviewService.deleteReview(reviewId, userId);

      res.json({ success: true, message: 'Xoá đánh giá thành công' });
    } catch (err) {
      res.status(403).json({ success: false, message: err.message });
    }
  }
}

module.exports = ReviewController;