const express = require('express');
const AttributeController = require('../controllers/AttributeController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', AttributeController.getAttributes);
router.get('/:id', AttributeController.getAttributeById);
router.post('/', protect, restrictTo('admin'), AttributeController.addAttribute);
router.put('/:id', protect, restrictTo('admin'), AttributeController.updateAttribute);
router.delete('/:id', protect, restrictTo('admin'), AttributeController.deleteAttribute);

module.exports = router;
