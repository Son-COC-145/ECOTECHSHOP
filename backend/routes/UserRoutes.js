const express = require('express');
const UserController = require('../controllers/UserController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// User routes
router.get('/me', protect, UserController.getMe);
router.patch('/change-password', protect, UserController.changePassword);
router.get('/:userId/name', UserController.getName);

// Admin routes (must be after /:userId/name to avoid conflict)
router.get('/', protect, restrictTo('admin'), UserController.getAllUsers);
router.get('/:userId', protect, restrictTo('admin'), UserController.getUserById);
router.patch('/:userId', protect, restrictTo('admin'), UserController.updateUser);

module.exports = router;
