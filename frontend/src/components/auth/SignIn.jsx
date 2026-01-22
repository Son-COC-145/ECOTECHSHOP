import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/sign-in.css";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // AuthContext sẽ tự điều hướng sau khi đăng nhập thành công
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrapper">
      <div className="sign-card sign-in">
        <h1 className="sign-heading">
          Đăng nhập <span>EcoTechStore</span>
        </h1>
        <p className="sign-subtitle">
          Đăng nhập để lưu giỏ hàng, theo dõi đơn và nhận ưu đãi dành riêng cho bạn.
        </p>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit} className="sign-form">
          <label htmlFor="email" className="sign-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="sign-input"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password" className="sign-label">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            className="sign-input"
            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button type="submit" className="sign-submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="sign-switch">
          <span>Bạn chưa có tài khoản?</span>
          <a href="/sign-up" className="sign-link">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </section>
  );
}

export default SignIn;