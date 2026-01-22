const express = require('express');
const router = express.Router();
const ChatBotController = require('../controllers/ChatBotController');

console.log("✅ Đã load file ChatBotRoutes.js"); // <--- THÊM DÒNG NÀY

// Định nghĩa đường dẫn: POST /api/chatbot/chat
router.post('/chat', ChatBotController.chat);

module.exports = router;