// src/pages/SignUp.jsx
import React, { useState } from "react";
import "../../styles/sign-up.css";
import { useAuth } from "../../context/AuthContext";
import { resendEmailOtp, verifyEmailOtp } from "../../services/signupApi";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const [step, setStep] = useState("form");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "username") {
      nextValue = value.replace(/[0-9]/g, "");
    }

    if (name === "phone") {
      nextValue = value.replace(/\D/g, "");
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const response = await register(
        formData.username,
        formData.email,
        formData.phone,
        formData.password
      );
      if (response?.requiresVerification) {
        setVerifyEmail(formData.email);
        setStep("verify");
        setMessage("Đã gửi mã xác thực về email. Vui lòng nhập mã để hoàn tất đăng ký.");
      } else {
        setMessage("Đăng ký thành công! Vui lòng đăng nhập.");
        setFormData({ username: "", email: "", phone: "", password: "" });
        navigate("/sign-in");
      }
    } catch (error) {
      setMessage(error.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpMessage("");
    setOtpLoading(true);
    try {
      await verifyEmailOtp({ email: verifyEmail, code: otpCode });
      setOtpMessage("Xác thực thành công! Bạn có thể đăng nhập.");
      setStep("form");
      setFormData({ username: "", email: "", phone: "", password: "" });
      setOtpCode("");
      navigate("/sign-in");
    } catch (error) {
      setOtpMessage(error.message || "Xác thực thất bại");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpMessage("");
    setOtpLoading(true);
    try {
      await resendEmailOtp({ email: verifyEmail });
      setOtpMessage("Đã gửi lại mã xác thực. Vui lòng kiểm tra email.");
    } catch (error) {
      setOtpMessage(error.message || "Gửi lại mã thất bại");
    } finally {
      setOtpLoading(false);
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

        {step === "form" ? (
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
              pattern="[^0-9]+"
              title="Họ và tên không được chứa số"
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
              inputMode="numeric"
              maxLength={10}
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
        ) : (
          <form className="sign-form" onSubmit={handleVerifyOtp}>
            {otpMessage && (
              <p
                className={
                  otpMessage.includes("thành công")
                    ? "sign-message success"
                    : "sign-message error"
                }
              >
                {otpMessage}
              </p>
            )}

            <label htmlFor="otp" className="sign-label">
              Mã xác thực (gửi đến {verifyEmail})
            </label>
            <input
              id="otp"
              name="otp"
              className="sign-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã 6 số"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              required
            />

            <button type="submit" className="sign-submit" disabled={otpLoading}>
              {otpLoading ? "Đang xác thực..." : "Xác thực"}
            </button>

            <button
              type="button"
              className="sign-submit"
              onClick={handleResendOtp}
              disabled={otpLoading}
            >
              Gửi lại mã
            </button>
          </form>
        )}

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