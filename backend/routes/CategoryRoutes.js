const express = require('express');
const CategoryController = require('../controllers/CategoryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/list', CategoryController.getCategories);
router.get('/', CategoryController.getCategories);
router.get('/:id', CategoryController.getCategoryById);
router.post('/', protect, restrictTo('admin'), CategoryController.addCategory);
router.put('/:id', protect, restrictTo('admin'), CategoryController.updateCategory);
router.delete('/:id', protect, restrictTo('admin'), CategoryController.deleteCategory);

module.exports = router;
