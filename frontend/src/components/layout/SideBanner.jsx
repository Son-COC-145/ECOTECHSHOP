// src/components/layout/SideBanner.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./SideBanner.css";

const SideBanner = () => {
  // Countdown cho Flash Sale
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 30, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          // Reset countdown
          return { hours: 2, minutes: 30, seconds: 0 };
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (num) => String(num).padStart(2, '0');

  return (
    <div className="side-banner-container">
      {/* Flash Sale Banner */}
      <Link to="/menu" className="side-banner-item flash-sale">
        <div className="banner-badge sale">⚡ FLASH</div>
        <div className="flash-content">
          <div className="flash-title">Flash Sale</div>
          <div className="flash-discount">Giảm đến 50%</div>
          <div className="countdown">
            <span className="time-box">{formatTime(timeLeft.hours)}</span>
            <span className="time-sep">:</span>
            <span className="time-box">{formatTime(timeLeft.minutes)}</span>
            <span className="time-sep">:</span>
            <span className="time-box">{formatTime(timeLeft.seconds)}</span>
          </div>
        </div>
      </Link>

      {/* Voucher Banner */}
      <div className="side-banner-item voucher">
        <div className="banner-badge hot">HOT</div>
        <div className="voucher-content">
          <div className="voucher-title">Mã giảm 100K</div>
          <div className="voucher-code">ECOTECH100</div>
          <div className="voucher-condition">Đơn từ 1 triệu</div>
        </div>
        <button 
          className="copy-btn"
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText("ECOTECH100");
            e.target.textContent = "Đã sao chép!";
            setTimeout(() => e.target.textContent = "Sao chép", 2000);
          }}
        >
          Sao chép
        </button>
      </div>

      {/* Freeship Banner */}
      <Link to="/menu" className="side-banner-item freeship">
        <div className="freeship-icon">🚚</div>
        <div className="freeship-content">
          <div className="freeship-title">FREESHIP</div>
          <div className="freeship-desc">Miễn phí vận chuyển đơn từ 500K</div>
        </div>
      </Link>

      {/* Payment Methods */}
      <Link to="/menu" className="side-banner-item payment">
        <div className="payment-content">
          <div className="payment-title">Thanh toán linh hoạt</div>
          <div className="payment-methods">
            <span className="method-tag">💳 VNPay</span>
            <span className="method-tag">💵 COD</span>
          </div>
        </div>
      </Link>

      {/* Warranty Banner */}
      <Link to="/menu" className="side-banner-item warranty">
        <div className="warranty-icon">🛡️</div>
        <div className="warranty-content">
          <div className="warranty-title">Bảo hành chính hãng</div>
          <div className="warranty-desc">12 tháng - Đổi mới 30 ngày</div>
        </div>
      </Link>
    </div>
  );
};

export default SideBanner;
