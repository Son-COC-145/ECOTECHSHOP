const express = require('express');
const controller = require('../controllers/PromotionController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', controller.getAll);
router.get('/:code', controller.getByCode);
router.post('/', protect, restrictTo('admin'), controller.create);

module.exports = router;
