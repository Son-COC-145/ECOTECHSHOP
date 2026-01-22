const ReviewDAO = require('../dao/ReviewDAO');
const Review = require('../models/Review');
const OrderDAO = require('../dao/OrderDAO');
const OrderItemDAO = require('../dao/OrderItemDAO');

class ReviewService {
  static async getByProduct(productId) {
    const rows = await ReviewDAO.getByProduct(productId);
    return rows.map(row => new Review(row));
  }

  static async getReviewForOrder({ userId, orderId, productId }) {
    const row = await ReviewDAO.getByUserOrderProduct({ userId, orderId, productId });
    return row ? new Review(row) : null;
  }

  static async getReviewByUserProduct({ userId, productId }) {
    const row = await ReviewDAO.getByUserProduct({ userId, productId });
    return row ? new Review(row) : null;
  }

  static async createOrUpdateReview({ userId, orderId, productId, rating, comment }) {
    // Convert sang number để đảm bảo so sánh đúng
    const orderIdNum = Number(orderId);
    const productIdNum = Number(productId);
    const userIdNum = Number(userId);

    // ✅ VALIDATION: Kiểm tra order tồn tại và thuộc về user
    const order = await OrderDAO.getById(orderIdNum);
    if (!order || !order.orderId) {
      throw new Error('Không tìm thấy đơn hàng.');
    }
    
    if (Number(order.userId) !== userIdNum) {
      throw new Error('Bạn không có quyền đánh giá đơn hàng này.');
    }

    // ✅ VALIDATION: Kiểm tra order status = "Delivered"
    if (order.orderStatus !== 'Delivered') {
      throw new Error('Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công.');
    }

    // ✅ VALIDATION: Kiểm tra productId có trong OrderItem của order
    const orderItemsResult = await OrderItemDAO.getByOrder(orderIdNum);
    const orderItems = Array.isArray(orderItemsResult) ? orderItemsResult : (orderItemsResult?.recordset || []);
    
    if (!orderItems || orderItems.length === 0) {
      throw new Error('Đơn hàng không có sản phẩm nào.');
    }
    
    const productExists = orderItems.some(item => Number(item.productId) === productIdNum);
    
    if (!productExists) {
      throw new Error('Sản phẩm này không có trong đơn hàng.');
    }

    // ✅ Tìm review theo userId + productId (không phụ thuộc order)
    // Mỗi sản phẩm chỉ được review 1 lần trong 1 tài khoản
    const existing = await ReviewDAO.getByUserProduct({ 
      userId: userIdNum, 
      productId: productIdNum 
    });

    if (existing) {
      // Nếu đã có review, update (có thể update cả orderId nếu muốn lưu order gần nhất)
      await ReviewDAO.update(existing.reviewId, { rating, comment });
      return { action: 'update', reviewId: existing.reviewId };
    }

    await ReviewDAO.create({ 
      userId: userIdNum, 
      orderId: orderIdNum, 
      productId: productIdNum, 
      rating, 
      comment 
    });
    return { action: 'create' };
  }

  static async deleteReview(reviewId, userId) {
    const myReview = await ReviewDAO.findById(reviewId);
    if (!myReview) throw new Error('Không tìm thấy đánh giá.');
    if (myReview.userId !== userId) throw new Error('Không có quyền xoá.');

    await ReviewDAO.delete(reviewId);
  }
}

module.exports = ReviewService;