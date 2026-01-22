import React from 'react';
import '../../styles/big-image.css';

const BigImage = () => {
    return (
        <div className="big-image-container">
            <div className="big-image-overlay"></div>
            <div className="big-image-content">
                <h1 className="big-image-title">EcoTechStore</h1>
                <p className="big-image-subtitle">
                    Khám phá thế giới công nghệ với những sản phẩm điện tử cao cấp, chính hãng và giá cả cạnh tranh nhất.
                </p>
                <div className="big-image-features">
                    <div className="feature-item">
                        <span className="feature-icon">📱</span>
                        <span>Điện thoại thông minh</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">💻</span>
                        <span>Laptop & PC</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🎧</span>
                        <span>Phụ kiện điện tử</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BigImage;
