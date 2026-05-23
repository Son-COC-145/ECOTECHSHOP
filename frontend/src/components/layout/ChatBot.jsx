import React, { useState, useEffect, useRef } from "react";
import { useCart } from "../../context/CartContext";
import "../../styles/ChatBot.css";
import axios from "axios";

function ChatBot() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [currentProducts, setCurrentProducts] = useState([]);
    const chatBoxRef = useRef(null);

    const { cartItems } = useCart();

    const AI_URL =
        process.env.REACT_APP_AI_URL ||
        "https://sonny145-ecotech-ai-service.hf.space";

    useEffect(() => {
        if (!hasGreeted && isChatOpen) {
            setChatMessages([
                {
                    role: "model",
                    text:
                        "Xin chào! 👋 Tôi là trợ lý ảo của shop. Tôi có thể giúp bạn:\n\n" +
                        "• Tìm kiếm sản phẩm\n" +
                        "• Tư vấn về sản phẩm\n" +
                        "• Hỏi về đơn hàng\n" +
                        "• Hỗ trợ khác\n\n" +
                        "Hãy hỏi tôi bất cứ điều gì! 😊",
                },
            ]);
            setHasGreeted(true);
        }
    }, [isChatOpen, hasGreeted, cartItems]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [chatMessages, currentProducts]);

    const toggleChat = () => {
        setIsChatOpen((prev) => !prev);
    };

    const normalizeHistoryRole = (role) => {
        if (role === "model") return "assistant";
        return role;
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isChatLoading) return;

        const inputValue = userInput.trim();
        const userMessage = { role: "user", text: inputValue };

        setChatMessages((prev) => [...prev, userMessage]);
        setIsChatLoading(true);
        setUserInput("");

        try {
            const history = chatMessages.slice(-5).map((msg) => ({
                role: normalizeHistoryRole(msg.role),
                content: msg.text,
            }));

            const response = await axios.post(
                `${AI_URL}/chat`,
                {
                    question: inputValue,
                    history,
                    top_k: 5,
                },
                {
                    timeout: 90000,
                }
            );

            const answer =
                response.data?.answer ||
                response.data?.response ||
                response.data?.message ||
                "Tôi đã nhận được câu hỏi của bạn nhưng chưa có câu trả lời phù hợp.";

            const products = Array.isArray(response.data?.products)
                ? response.data.products
                : [];

            setChatMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    text: answer,
                },
            ]);

            setCurrentProducts(products);
        } catch (error) {
            console.error("Lỗi khi gọi chatbot API:", error);

            let errorMessage =
                "Xin lỗi, tôi không thể trả lời ngay. Vui lòng thử lại sau!";

            if (error.code === "ECONNABORTED") {
                errorMessage =
                    "⏱️ Kết nối quá thời gian. Lần đầu khởi động AI có thể hơi lâu, vui lòng thử lại.";
            } else if (error.response) {
                if (error.response.status === 422) {
                    errorMessage =
                        "⚠️ Dữ liệu gửi tới AI chưa đúng định dạng. Vui lòng thử lại sau khi cập nhật frontend.";
                } else if (error.response.status === 500) {
                    errorMessage =
                        "⚠️ Hệ thống AI đang bảo trì. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
                } else if (error.response.status === 503) {
                    errorMessage =
                        "⚠️ Dịch vụ AI chưa sẵn sàng. Vui lòng đợi vài giây rồi thử lại.";
                } else {
                    errorMessage = `❌ Lỗi: ${
                        error.response.data?.detail ||
                        error.response.data?.message ||
                        error.message
                    }`;
                }
            } else if (error.request) {
                errorMessage =
                    "🌐 Không thể kết nối đến server AI. Vui lòng kiểm tra kết nối mạng.";
            }

            setChatMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    text: errorMessage,
                },
            ]);
            setCurrentProducts([]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleProductClick = (product) => {
        const category =
            product.category?.toLowerCase().replace(/\s+/g, "-") || "all";
        window.location.href = `/product/${category}/${product.id}`;
    };

    return (
        <>
            <div className="chat-icon" onClick={toggleChat}>
                💬
            </div>

            <div
                className={`chat-container ${isChatOpen ? "" : "hidden"}`}
                id="chatContainer"
            >
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

                    {currentProducts.length > 0 && (
                        <div className="chat-products">
                            <div className="chat-products-title">
                                📦 Sản phẩm gợi ý:
                            </div>
                            <div className="chat-products-grid">
                                {currentProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="chat-product-card"
                                        onClick={() =>
                                            handleProductClick(product)
                                        }
                                    >
                                        {product.image && (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="chat-product-image"
                                                onError={(e) => {
                                                    e.target.style.display =
                                                        "none";
                                                }}
                                            />
                                        )}
                                        <div className="chat-product-info">
                                            <h4 className="chat-product-name">
                                                {product.name}
                                            </h4>
                                            <p className="chat-product-category">
                                                {product.category}
                                            </p>
                                            {product.price && (
                                                <p className="chat-product-price">
                                                    {product.price.toLocaleString(
                                                        "vi-VN"
                                                    )}{" "}
                                                    VNĐ
                                                </p>
                                            )}
                                            {product.rating > 0 && (
                                                <p className="chat-product-rating">
                                                    ⭐{" "}
                                                    {parseFloat(
                                                        product.rating
                                                    ).toFixed(2)}
                                                    /5
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
                        onKeyPress={(e) =>
                            e.key === "Enter" &&
                            !isChatLoading &&
                            handleSendMessage()
                        }
                        disabled={isChatLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isChatLoading}>
                        {isChatLoading ? "⏳" : "Gửi"}
                    </button>
                </div>
            </div>
        </>
    );
}

export default ChatBot;