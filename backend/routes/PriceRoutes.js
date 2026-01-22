const express = require('express');
const PriceController = require('../controllers/PriceController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', PriceController.getPrices);
router.get('/:id', PriceController.getPriceById);
router.post('/', protect, restrictTo('admin'), PriceController.addPrice);
router.put('/:id', protect, restrictTo('admin'), PriceController.updatePrice);
router.delete('/:id', protect, restrictTo('admin'), PriceController.deletePrice);

module.exports = router;
