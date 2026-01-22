const express = require('express');
const router = express.Router();
const { upload, UploadController } = require('../controllers/UploadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/image', protect, upload, UploadController.uploadImage);
router.delete('/image', protect, UploadController.deleteImage);

module.exports = router;

