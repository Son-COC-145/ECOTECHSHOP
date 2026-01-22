const express = require('express');
const SummaryController = require('../controllers/SummaryController');
const router = express.Router();

router.get('/:productId', SummaryController.getSummary);
router.post('/:productId/review', SummaryController.addReviewAndUpdateSummary);

module.exports = router;
