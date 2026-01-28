import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./SideBanner.css";

const SideBanner = () => {
  // ===== STATE =====
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 30, seconds: 0 });

  // ===== BANNER DATA =====
  const banners = [
    {
      id: 1,
      type: "flash-sale",
      title: "Flash Sale",
      subtitle: "Giảm đến 50%",
      badge: "⚡ FLASH",
      badgeType: "sale",
      gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      link: "/menu",
      showCountdown: true,
    },
    {
      id: 2,
      type: "voucher",
      title: "Mã giảm 100K",
      subtitle: "ECOTECH100",
      description: "Đơn từ 1 triệu",
      badge: "HOT",
      badgeType: "hot",
      gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
      color: "#b45309",
      link: null,
      showCopyBtn: true,
    },
    {
      id: 3,
      type: "freeship",
      title: "FREESHIP",
      subtitle: "Miễn phí vận chuyển",
      description: "Đơn từ 500K",
      icon: "🚚",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      link: "/menu",
    },
    {
      id: 4,
      type: "payment",
      title: "Thanh toán linh hoạt",
      subtitle: "VNPay • COD • Momo",
      icon: "💳",
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      link: "/menu",
    },
    {
      id: 5,
      type: "warranty",
      title: "Bảo hành chính hãng",
      subtitle: "12 tháng - Đổi mới 30 ngày",
      icon: "🛡️",
      gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      link: "/menu",
    },
  ];

  const totalSlides = banners.length;

  // ===== AUTO-PLAY LOGIC =====
  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Auto-play timer
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, 4000); // 4 giây đổi banner

    return () => clearInterval(timer);
  }, [isPaused, goToNext]);

  // ===== COUNTDOWN TIMER =====
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
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
          return { hours: 2, minutes: 30, seconds: 0 };
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (num) => String(num).padStart(2, "0");

  // ===== COPY VOUCHER =====
  const handleCopyVoucher = (e, code) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    e.target.textContent = "Đã sao chép!";
    setTimeout(() => (e.target.textContent = "Sao chép"), 2000);
  };

  // ===== RENDER BANNER CONTENT =====
  const renderBannerContent = (banner) => {
    switch (banner.type) {
      case "flash-sale":
        return (
          <div className="banner-content flash-sale-content">
            <div className="flash-content">
              <div className="flash-title">{banner.title}</div>
              <div className="flash-discount">{banner.subtitle}</div>
              {banner.showCountdown && (
                <div className="countdown">
                  <span className="time-box">{formatTime(timeLeft.hours)}</span>
                  <span className="time-sep">:</span>
                  <span className="time-box">{formatTime(timeLeft.minutes)}</span>
                  <span className="time-sep">:</span>
                  <span className="time-box">{formatTime(timeLeft.seconds)}</span>
                </div>
              )}
            </div>
          </div>
        );

      case "voucher":
        return (
          <div className="banner-content voucher-content">
            <div className="voucher-text">
              <div className="voucher-title" style={{ color: banner.color }}>
                {banner.title}
              </div>
              <div className="voucher-code">{banner.subtitle}</div>
              <div className="voucher-condition" style={{ color: banner.color }}>
                {banner.description}
              </div>
            </div>
            {banner.showCopyBtn && (
              <button
                className="copy-btn"
                onClick={(e) => handleCopyVoucher(e, banner.subtitle)}
              >
                Sao chép
              </button>
            )}
          </div>
        );

      case "freeship":
        return (
          <div className="banner-content freeship-content">
            <div className="banner-icon">{banner.icon}</div>
            <div className="banner-text">
              <div className="banner-title">{banner.title}</div>
              <div className="banner-desc">{banner.subtitle}</div>
              {banner.description && (
                <div className="banner-subdesc">{banner.description}</div>
              )}
            </div>
          </div>
        );

      case "payment":
      case "warranty":
        return (
          <div className="banner-content icon-text-content">
            <div className="banner-icon">{banner.icon}</div>
            <div className="banner-text">
              <div className="banner-title">{banner.title}</div>
              <div className="banner-desc">{banner.subtitle}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ===== RENDER =====
  return (
    <div
      className="side-banner-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Wrapper */}
      <div className="banner-carousel">
        {/* Slides */}
        <div
          className="banner-slides"
          style={{
            transform: `translateY(-${currentSlide * 100}%)`,
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {banners.map((banner) => {
            const BannerWrapper = banner.link ? Link : "div";
            const wrapperProps = banner.link
              ? { to: banner.link, className: "banner-slide" }
              : { className: "banner-slide banner-slide-no-link" };

            return (
              <BannerWrapper
                key={banner.id}
                {...wrapperProps}
                style={{ background: banner.gradient }}
              >
                {/* Badge */}
                {banner.badge && (
                  <div className={`banner-badge ${banner.badgeType}`}>
                    {banner.badge}
                  </div>
                )}

                {/* Content */}
                {renderBannerContent(banner)}
              </BannerWrapper>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          className="banner-nav banner-nav-prev"
          onClick={(e) => {
            e.preventDefault();
            goToPrev();
          }}
          aria-label="Previous banner"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <button
          className="banner-nav banner-nav-next"
          onClick={(e) => {
            e.preventDefault();
            goToNext();
          }}
          aria-label="Next banner"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Pagination Dots */}
        <div className="banner-pagination">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`pagination-dot ${currentSlide === index ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SideBanner;