const express = require('express');
const ReviewController = require('../controllers/ReviewController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/product/:productId', ReviewController.getReviewsByProduct);
router.get('/user/product/:productId', protect, ReviewController.getReviewByUserProduct);
router.get('/order/:orderId/product/:productId', protect, ReviewController.getReviewByOrderAndProduct);
router.post('/', protect, ReviewController.createOrUpdateReview);
router.delete('/:reviewId', protect, ReviewController.deleteReviewById);

module.exports = router;
