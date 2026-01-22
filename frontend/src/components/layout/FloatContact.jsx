import React from 'react';
import '../../styles/style.css'; // Đảm bảo import file CSS của bạn

function FloatContact() {
    return (
        <div className="float-contact">
            <div className="contact-icons">
                <div className="chat-whatsapp">
                    <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">
                        <i title="Chat Whatsapp" className="fa-brands fa-whatsapp"></i>
                    </a>
                </div>
                <div className="chat-facebook">
                    <a href="https://m.me/504099972782610" target="_blank" rel="noopener noreferrer">
                        <i title="Nhắn tin ngay" className="fa-brands fa-facebook-messenger"></i>
                    </a>
                </div>
                <div className="call-hotline">
                    <a href="tel:0336562004" target="_blank" rel="noopener noreferrer">
                        <i className="fa-solid fa-phone"></i>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default FloatContact;