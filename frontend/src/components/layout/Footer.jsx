// src/components/layout/Footer.jsx
import React from "react";
import "../../styles/Footer.css";
import EcoTechLogo from "../common/EcoTechLogo";

function Footer() {
  return (
    <footer className="footer" id="contact">
      {/* Dải đỏ mỏng phía trên cho đồng bộ header */}
      <div className="footer-top-border" />

      {/* KHU VỰC CHÍNH */}
      <div className="footer-container">
        {/* Cột 1: Brand */}
        <div className="footer-col footer-col-brand">
          <div className="footer-logo">
            <EcoTechLogo size={48} showText={true} linkTo="/" />
          </div>
          <p className="footer-desc">
            Nền tảng mua sắm thiết bị công nghệ: Điện thoại, Laptop, Tablet và
            phụ kiện chính hãng. Mang công nghệ hiện đại đến gần bạn hơn mỗi
            ngày.
          </p>
          <div className="footer-badges">
            <span className="footer-badge">Chính hãng</span>
            <span className="footer-badge">Giá tốt</span>
            <span className="footer-badge">Giao nhanh</span>
          </div>
        </div>

        {/* Cột 2: Sản phẩm */}
        <div className="footer-col">
          <h4 className="footer-title">Sản phẩm</h4>
          <ul className="footer-list">
            <li>
              <a href="#!" className="footer-link">
                Điện thoại
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Laptop
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Tablet
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Âm thanh
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Phụ kiện
              </a>
            </li>
          </ul>
        </div>

        {/* Cột 3: Hỗ trợ */}
        <div className="footer-col">
          <h4 className="footer-title">Hỗ trợ</h4>
          <ul className="footer-list">
            <li>
              <a href="#!" className="footer-link">
                Trung tâm bảo hành
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Chính sách bảo hành
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Chính sách đổi trả
              </a>
            </li>
            <li>
              <a href="#!" className="footer-link">
                Hướng dẫn mua hàng online
              </a>
            </li>
          </ul>
        </div>

        {/* Cột 4: Liên hệ + social */}
        <div className="footer-col footer-col-contact">
          <h4 className="footer-title">Liên hệ</h4>
          <ul className="footer-contact-list">
            <li>
              <i className="fas fa-location-dot" />
              <span>Hà Đông, Hà Nội</span>
            </li>
            <li>
              <i className="fas fa-envelope" />
              <a href="mailto:support@techstore.vn">support@techstore.vn</a>
            </li>
            <li>
              <i className="fas fa-phone" />
              <span>1900 9999</span>
            </li>
            <li>
              <i className="fas fa-headset" />
              <span>Hỗ trợ kỹ thuật: 0931 123 456</span>
            </li>
          </ul>

          <div className="footer-social">
            <a href="#" className="footer-social-item">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#" className="footer-social-item">
              <i className="fab fa-tiktok" />
            </a>
            <a href="#" className="footer-social-item">
              <i className="fab fa-youtube" />
            </a>
            <a href="#" className="footer-social-item">
              <i className="fab fa-instagram" />
            </a>
          </div>
        </div>
      </div>

      {/* Dòng bản quyền */}
      <div className="footer-bottom">
        <span>© 2025 EcoTechStore. All rights reserved.</span>
        <span>
          Developed by <strong>Nhóm 17</strong>
        </span>
      </div>
    </footer>
  );
}

export default Footer;