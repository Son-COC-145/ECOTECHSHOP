const express = require('express');
const AuthController = require('../controllers/AuthController'); // ✅ đồng bộ với file thực tế
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', protect, AuthController.getMe);

module.exports = router;