// src/components/profile/ProfileInfo.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiConfig } from "../../config/api";
import "../../styles/Profile.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const ProfileInfo = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maskEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;

    const [name, domain] = parts;
    if (name.length <= 2) {
      return `${name[0] || ""}****@${domain}`;
    }
    return `${name.substring(0, 2)}****@${domain}`;
  };

  const getAvatarLetter = () => {
    if (!user?.email) return "?";
    return user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.fullName) return user.fullName;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split("@")[0];
    return "Người dùng EcotechStore";
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!user || !user.token) {
      toast.error("Vui lòng đăng nhập lại để đổi mật khẩu");
      logout();
      navigate("/sign-in");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword === oldPassword) {
      toast.error("Mật khẩu mới không được trùng mật khẩu cũ");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await axios.put(
        `${BASE_URL}/api/users/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      toast.success(response.data.message || "Đổi mật khẩu thành công");
      setOldPassword("");
      setNewPassword("");
      setShowPasswordForm(false);

      setTimeout(() => {
        logout();
        navigate("/sign-in");
        toast.info("Vui lòng đăng nhập lại với mật khẩu mới");
      }, 1500);
    } catch (error) {
      const status = error.response?.status;
      const message =
        error.response?.data?.message || "Lỗi khi đổi mật khẩu";

      toast.error(message);

      if (status === 401) {
        logout();
        navigate("/sign-in");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div className="profile-header">
            <h2>Tài khoản EcotechStore</h2>
            <p>Đăng nhập để xem thông tin cá nhân và lịch sử đơn hàng.</p>
          </div>
          <div className="profile-empty">
            <p>Bạn chưa đăng nhập.</p>
            <button
              className="primary-btn"
              type="button"
              onClick={() => navigate("/sign-in")}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <h2>Tài khoản EcotechStore</h2>
          <p>Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.</p>
        </div>

        <div className="profile-layout">
          {/* Cột trái: thông tin user */}
          <div className="profile-left">
            <div className="profile-user-block">
              <div className="profile-avatar">
                <span>{getAvatarLetter()}</span>
              </div>
              <div className="profile-user-text">
                <h3>{getDisplayName()}</h3>
                <div className="profile-badges">
                  <span className="badge badge-member">Thành viên</span>
                  {/* Nếu sau này có role admin thì show thêm badge khác */}
                </div>
                <p className="profile-email">
                  Email:{" "}
                  <span className="email-masked">
                    {maskEmail(user.email)}
                  </span>
                </p>
              </div>
            </div>

            <div className="profile-highlight-box">
              <h4>Bảo mật tài khoản</h4>
              <p>
                Để đảm bảo an toàn, bạn nên định kỳ thay đổi mật khẩu và
                không chia sẻ thông tin đăng nhập cho bất kỳ ai.
              </p>
              <ul>
                <li>Mật khẩu tối thiểu 6 ký tự.</li>
                <li>Nên bao gồm chữ hoa, chữ thường và số.</li>
              </ul>
            </div>
          </div>

          {/* Cột phải: đổi mật khẩu */}
          <div className="profile-right">
            <div className="password-card">
              <div className="password-card-header">
                <h3>Đổi mật khẩu</h3>
                <button
                  type="button"
                  className="toggle-password-form-btn"
                  onClick={() => setShowPasswordForm((prev) => !prev)}
                >
                  {showPasswordForm ? "Đóng" : "Mở form"}
                </button>
              </div>

              {showPasswordForm ? (
                <form
                  onSubmit={handlePasswordChange}
                  className="password-form"
                >
                  <div className="form-group">
                    <label>Mật khẩu cũ</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="password-input"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="password-input"
                      autoComplete="new-password"
                      required
                    />
                    <p className="input-hint">
                      Mật khẩu tối thiểu 6 ký tự, nên bao gồm chữ và số.
                    </p>
                  </div>

                  <div className="password-actions">
                    <button
                      type="submit"
                      className="update-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setOldPassword("");
                        setNewPassword("");
                      }}
                      disabled={isSubmitting}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="password-closed-note">
                  <p>
                    Bấm <strong>Mở form</strong> để thay đổi mật khẩu tài
                    khoản của bạn.
                  </p>
                </div>
              )}
            </div>

            <div className="profile-security-note">
              <p>
                Nếu bạn nghi ngờ tài khoản bị truy cập trái phép, hãy đổi
                mật khẩu ngay và liên hệ hỗ trợ của EcotechStore.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;
