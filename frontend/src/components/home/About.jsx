// src/components/home/About.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../../styles/about.css";
import { useAuth } from "../../context/AuthContext";

function About() {
  const { user } = useAuth();

  return (
    <section className="about" id="about">
      <div className="about-container">
        {/* HEADER: căn giữa */}
        <div className="about-header">
          <p className="about-eyebrow">Về EcoTechStore</p>

          <h2 className="about-title">
            Công nghệ thông minh – Giải pháp kinh tế
          </h2>

          <p className="about-subtitle">
            <strong>EcoTechStore</strong> kết hợp{" "}
            <strong>Eco (Economic)</strong> và{" "}
            <strong>Tech (Technology)</strong> – mang đến các thiết bị công nghệ
            chính hãng với mức giá tối ưu, giúp bạn dễ dàng tiếp cận công nghệ
            hiện đại mà không cần chi tiêu quá nhiều.
          </p>
        </div>

        {/* THÂN BÀI: 1 cột, ảnh lồng bên phải */}
        <div className="about-body">
          {/* ẢNH LỒNG BÊN PHẢI */}
          <div className="about-figure">
            <img
              src="https://res.cloudinary.com/ddsq87ayt/image/upload/v1764811585/about_m4jbsq.png"
              alt="EcoTechStore - nền tảng mua sắm thiết bị công nghệ"
              loading="lazy"
            />
          </div>

          <h3 className="about-heading">Tối ưu chi phí – Tối ưu trải nghiệm</h3>

          <p className="about-text-body">
            Thay vì phải so sánh giá ở nhiều nơi, bạn có thể tìm, xem thông số
            và đặt mua sản phẩm công nghệ ngay trên EcoTechStore với thông tin
            minh bạch và hỗ trợ tận tâm. Chúng tôi giúp bạn chọn đúng sản phẩm
            phù hợp với nhu cầu học tập, làm việc hay giải trí, thay vì mua theo
            cảm tính.
          </p>

          <ul className="about-highlights">
            <li>Giá bán cạnh tranh, được cập nhật theo thị trường.</li>
            <li>Danh mục đa dạng: điện thoại, laptop, tablet, phụ kiện…</li>
            <li>Tư vấn theo nhu cầu thực tế: văn phòng, học tập, gaming…</li>
            <li>Bảo hành rõ ràng, hỗ trợ nhanh sau khi mua.</li>
          </ul>

          {/* CTA / CHÀO USER: căn giữa */}
          <div className="about-actions">
            {user ? (
              <p className="about-welcome">
                Chào mừng <strong>{user.username}</strong> quay lại{" "}
                <strong>EcoTechStore</strong>! Khám phá ngay những sản phẩm mới
                phù hợp với bạn.
              </p>
            ) : (
              <>
                <Link className="about-btn" to="/sign-in">
                  Đăng nhập để bắt đầu mua sắm
                </Link>
                <p className="about-note">
                  Đăng nhập để lưu giỏ hàng, theo dõi đơn hàng và nhận những ưu
                  đãi dành riêng cho bạn.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
