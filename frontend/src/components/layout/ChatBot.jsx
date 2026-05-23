import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import '../../styles/ChatBot.css';
import axios from 'axios';
import { apiConfig } from '../../config/api';

function ChatBot() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [currentProducts, setCurrentProducts] = useState([]); // Sản phẩm từ RAG
    const chatBoxRef = useRef(null);

    const { cartItems, total, totalItems } = useCart();

    // Greeting message khi mở chat lần đầu
    useEffect(() => {
        if (!hasGreeted && isChatOpen) {
            const productInfo = cartItems.length > 0
                ? cartItems.map(item => `${item.name}: ${item.price.toLocaleString()} VND, Số lượng: ${item.quantity}`).join('\n')
                : 'Giỏ hàng của bạn đang trống.';

            setChatMessages([
                { 
                    role: 'model', 
                    text: `Xin chào! 👋 Tôi là trợ lý ảo của shop. Tôi có thể giúp bạn:\n\n• Tìm kiếm sản phẩm\n• Tư vấn về sản phẩm\n• Hỏi về đơn hàng\n• Hỗ trợ khác\n\nHãy hỏi tôi bất cứ điều gì! 😊` 
                }
            ]);
            setHasGreeted(true);
        }
    }, [isChatOpen, hasGreeted, cartItems]);

    // Auto scroll to bottom
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [chatMessages, currentProducts]);

    const toggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isChatLoading) return;

        const userMessage = { role: 'user', text: userInput };
        setChatMessages(prev => [...prev, userMessage]);
        setIsChatLoading(true);
        const inputValue = userInput;
        setUserInput('');

        try {
            // Gọi API backend chatbot
            const AI_URL = "https://sonny145-ecotech-ai-service.hf.space";

            const response = await axios.post(
            `${AI_URL}/chat`,
            {
                question: inputValue,
                history: chatMessages.slice(-5).map(msg => ({
                role: msg.role,
                content: msg.text
                })),
                top_k: 5
            },
            {
                timeout: 60000
            }
            );  

            if (response.data.success && response.data.data) {
                const { answer, products } = response.data.data;

                // Cập nhật messages với answer từ AI
                setChatMessages(prev => [...prev, { 
                    role: 'model', 
                    text: answer 
                }]);

                // Lưu products để hiển thị
                if (products && products.length > 0) {
                    setCurrentProducts(products);
                } else {
                    setCurrentProducts([]);
                }
            } else {
                throw new Error(response.data.message || 'Không nhận được phản hồi từ server');
            }
        } catch (error) {
            console.error('Lỗi khi gọi chatbot API:', error);
            
            let errorMessage = 'Xin lỗi, tôi không thể trả lời ngay. Vui lòng thử lại sau!';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = '⏱️ Kết nối quá thời gian. Vui lòng thử lại sau.';
            } else if (error.response) {
                if (error.response.status === 500) {
                    errorMessage = '⚠️ Hệ thống AI đang bảo trì. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
                } else if (error.response.status === 503) {
                    errorMessage = '⚠️ Dịch vụ AI chưa sẵn sàng. Vui lòng đợi vài giây rồi thử lại.';
                } else {
                    errorMessage = `❌ Lỗi: ${error.response.data?.message || error.message}`;
                }
            } else if (error.request) {
                errorMessage = '🌐 Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
            }

            setChatMessages(prev => [...prev, { 
                role: 'model', 
                text: errorMessage 
            }]);
            setCurrentProducts([]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleProductClick = (product) => {
        // Navigate to product detail page
        const category = product.category?.toLowerCase().replace(/\s+/g, '-') || 'all';
        window.location.href = `/product/${category}/${product.id}`;
    };

    return (
        <>
            <div className="chat-icon" onClick={toggleChat}>
                💬
            </div>
            
            <div className={`chat-container ${isChatOpen ? '' : 'hidden'}`} id="chatContainer">
                <div className="chat-header">
                    <h2>Hỗ trợ khách hàng</h2>
                    <button className="close-chat-btn" onClick={toggleChat}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="chat-box" id="chatBox" ref={chatBoxRef}>
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.role}`}>
                            <p>{msg.text}</p>
                        </div>
                    ))}
                    
                    {/* Hiển thị sản phẩm từ RAG */}
                    {currentProducts.length > 0 && (
                        <div className="chat-products">
                            <div className="chat-products-title">📦 Sản phẩm gợi ý:</div>
                            <div className="chat-products-grid">
                                {currentProducts.map((product) => (
                                    <div 
                                        key={product.id} 
                                        className="chat-product-card"
                                        onClick={() => handleProductClick(product)}
                                    >
                                        {product.image && (
                                            <img 
                                                src={product.image} 
                                                alt={product.name}
                                                className="chat-product-image"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="chat-product-info">
                                            <h4 className="chat-product-name">{product.name}</h4>
                                            <p className="chat-product-category">{product.category}</p>
                                            {product.price && (
                                                <p className="chat-product-price">
                                                    {product.price.toLocaleString('vi-VN')} VNĐ
                                                </p>
                                            )}
                                            {product.rating > 0 && (
                                                <p className="chat-product-rating">
                                                    ⭐ {parseFloat(product.rating).toFixed(2)}/5
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {isChatLoading && (
                        <div className="chat-message model">
                            <p>Đang xử lý...</p>
                        </div>
                    )}
                </div>
                
                <div className="input-group">
                    <input
                        type="text"
                        id="userInput"
                        placeholder="Nhập tin nhắn của bạn..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && handleSendMessage()}
                        disabled={isChatLoading}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading}
                    >
                        {isChatLoading ? '⏳' : 'Gửi'}
                    </button>
                </div>
            </div>
        </>
    );
}

export default ChatBot;
