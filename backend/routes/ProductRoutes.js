const express = require('express');
const ProductController = require('../controllers/ProductController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// PUBLIC
router.get('/', ProductController.getProducts);
router.get('/by-category/:categoryId', ProductController.getByCategory);
router.get('/:id', ProductController.getProductById);
router.get("/:id/related", ProductController.getRelatedProduct);
// ADMIN
router.post('/', protect, restrictTo('admin'), ProductController.addProduct);
router.put('/:id', protect, restrictTo('admin'), ProductController.updateProduct);
router.delete('/:id', protect, restrictTo('admin'), ProductController.deleteProduct);

module.exports = router;
