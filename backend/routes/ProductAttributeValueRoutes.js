const express = require('express');
const controller = require('../controllers/ProductAttributeValueController');
const router = express.Router();

router.get('/product/:productId', controller.getByProduct);
router.post('/', controller.create);

module.exports = router;
