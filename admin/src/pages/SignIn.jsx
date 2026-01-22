// src/pages/SignIn.jsx - Tech-oriented Admin SignIn
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/sign-in.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      setError(err.message || "Đăng nhập thất bại! Vui lòng kiểm tra lại email và mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sign-in-wrapper">
      <div className="sign-in-container">
        <div className="sign-in-card">
          <div className="sign-in-header">
            <div className="sign-in-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
                <path d="M2 12L12 17L22 12" />
              </svg>
            </div>
            <h1 className="sign-in-heading">Admin Panel</h1>
            <p className="sign-in-subtitle">Đăng nhập để quản lý hệ thống</p>
          </div>

          {error && (
            <div className="sign-in-error">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M10 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="sign-in-form">
            <div className="sign-in-form-group">
              <label htmlFor="email" className="sign-in-label">
                Email
              </label>
              <div className="sign-in-input-wrapper">
                <svg className="sign-in-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 6.66667L10 11.6667L17.5 6.66667M3.33333 15H16.6667C17.5871 15 18.3333 14.2538 18.3333 13.3333V6.66667C18.3333 5.74619 17.5871 5 16.6667 5H3.33333C2.41286 5 1.66667 5.74619 1.66667 6.66667V13.3333C1.66667 14.2538 2.41286 15 3.33333 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  className="sign-in-input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="sign-in-form-group">
              <label htmlFor="password" className="sign-in-label">
                Mật khẩu
              </label>
              <div className="sign-in-input-wrapper">
                <svg className="sign-in-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.83333 9.16667V5.83333C5.83333 4.72876 6.27232 3.66893 7.05372 2.88753C7.83512 2.10613 8.89495 1.66667 9.99999 1.66667C11.105 1.66667 12.1649 2.10613 12.9463 2.88753C13.7277 3.66893 14.1667 4.72876 14.1667 5.83333V9.16667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input
                  id="password"
                  type="password"
                  className="sign-in-input"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength="6"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="sign-in-submit" disabled={loading}>
              {loading ? (
                <>
                  <svg className="sign-in-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="sign-in-footer">
            <p className="sign-in-help">
              Bạn chưa có tài khoản admin?{" "}
              <span className="sign-in-link">Liên hệ quản trị viên</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;