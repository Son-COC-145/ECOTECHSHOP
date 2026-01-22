const axios = require('axios');

class ChatBotController {
    // Hàm gọi sang Python AI Service
    async chat(req, res) {
        try {
            const { message, history } = req.body;
            
            // Validate input
            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng nhập câu hỏi"
                });
            }
            
            // Gọi sang AI Service (Python FastAPI) đang chạy ở port 8000
            const aiResponse = await axios.post('http://127.0.0.1:8000/chat', {
                question: message,
                history: history || [],
                top_k: 5
            }, {
                timeout: 30000 // 30 giây timeout
            });

            // Trả kết quả từ Python về cho Frontend React
            return res.status(200).json({
                success: true,
                data: aiResponse.data
            });

        } catch (error) {
            console.error("❌ Lỗi gọi AI Service:", error.message);
            
            // Phân biệt các loại lỗi
            if (error.code === 'ECONNREFUSED') {
                return res.status(503).json({
                    success: false,
                    message: "Hệ thống AI chưa sẵn sàng. Vui lòng đảm bảo Python AI Service đang chạy ở port 8000."
                });
            }
            
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                return res.status(504).json({
                    success: false,
                    message: "Kết nối đến AI Service quá thời gian. Vui lòng thử lại sau."
                });
            }
            
            if (error.response) {
                return res.status(error.response.status || 500).json({
                    success: false,
                    message: error.response.data?.message || "Lỗi từ AI Service"
                });
            }
            
            // Fallback cho các lỗi khác
            return res.status(500).json({
                success: false,
                message: "Hệ thống AI đang bảo trì, vui lòng thử lại sau."
            });
        }
    }
}

module.exports = new ChatBotController();