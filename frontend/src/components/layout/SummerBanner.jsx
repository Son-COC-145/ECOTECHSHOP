import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/banner.css";

const DISMISS_KEY = "welcomeBannerDismissedAt";
const DISMISS_TTL_HOURS = 24;

const SummerBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const diffHrs = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (diffHrs < DISMISS_TTL_HOURS) {
        setIsVisible(false);
        return;
      }
    }
    // Delay hiển thị để trang load xong trước
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setIsVisible(false);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") handleClose();
  };

  const handleShopNow = () => {
    handleClose();
    navigate("/menu");
  };

  if (!isVisible) return null;

  return (
    <div
      className={`banner-container ${isAnimating ? "fade-in" : "fade-out"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome banner"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleClose}
    >
      <div className="overlay" aria-hidden="true"></div>
      <div 
        className={`banner welcome-banner ${isAnimating ? "scale-in" : "scale-out"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn"
          onClick={handleClose}
          aria-label="Đóng banner chào mừng"
        >
          ×
        </button>
        <div className="welcome-content">
          <div className="welcome-badge">🎉 Ưu đãi đặc biệt</div>
          <h2 className="welcome-title">Chào mừng đến EcoTech!</h2>
          <p className="welcome-message">
            Công nghệ xanh - Cuộc sống thông minh
          </p>
          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">🚚</span>
              <span>Miễn phí vận chuyển</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💳</span>
              <span>Thanh toán an toàn</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Bảo hành chính hãng</span>
            </div>
          </div>
          <button className="welcome-cta" onClick={handleShopNow}>
            Khám phá ngay
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummerBanner;