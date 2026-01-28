// src/pages/SignUp.jsx
import React, { useState } from "react";
import "../../styles/sign-up.css";
import { useAuth } from "../../context/AuthContext";

function SignUp() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await register(
        formData.username,
        formData.email,
        formData.phone,
        formData.password
      );
      setMessage("Đăng ký thành công! Đang chuyển hướng...");
      setFormData({ username: "", email: "", phone: "", password: "" });
      // AuthContext sẽ tự navigate("/")
    } catch (error) {
      setMessage(error.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrapper">
      <div className="sign-card sign-up">
        <h1 className="sign-heading">
          Tạo tài khoản <span>EcoTechStore</span>
        </h1>
        <p className="sign-subtitle">
          Chỉ mất vài giây để tạo tài khoản và bắt đầu mua sắm, lưu lịch sử đơn hàng
          và nhận ưu đãi cá nhân hóa.
        </p>

        {message && (
          <p
            className={
              message.includes("thành công")
                ? "sign-message success"
                : "sign-message error"
            }
          >
            {message}
          </p>
        )}

        <form id="signUpForm" className="sign-form" onSubmit={handleSubmit}>
          <label htmlFor="username" className="sign-label">
            Họ và tên
          </label>
          <input
            id="username"
            name="username"
            className="sign-input"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <label htmlFor="email" className="sign-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            className="sign-input"
            type="email"
            placeholder="Ví dụ: abcxyz@gmail.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="phone" className="sign-label">
            Số điện thoại
          </label>
          <input
            id="phone"
            name="phone"
            className="sign-input"
            type="tel"
            placeholder="Ví dụ: 0123456789"
            value={formData.phone}
            onChange={handleChange}
            pattern="0[0-9]{9}"
            title="Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số"
            required
          />

          <label htmlFor="password" className="sign-label">
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            className="sign-input"
            type="password"
            placeholder="Nhập mật khẩu"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            required
          />
          <p className="password-hint">
            ✓ Tối thiểu 6 ký tự<br/>
            ✓ Phải có: chữ hoa (A-Z), chữ thường (a-z), số (0-9)<br/>
            Ví dụ: MyPass123, SecurePass2024
          </p>

          <button type="submit" className="sign-submit" disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="sign-switch">
          <span>Bạn đã có tài khoản?</span>
          <a href="/sign-in" className="sign-link">
            Đăng nhập
          </a>
        </p>
      </div>
    </section>
  );
}

export default SignUp;