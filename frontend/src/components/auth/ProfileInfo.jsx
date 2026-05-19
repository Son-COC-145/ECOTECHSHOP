import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiConfig } from "../../config/api";
import ShippingAddressForm from "../cart/ShippingAddressForm";
import addressApi from "../../services/addressApi";
import "../../styles/Profile.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const ProfileInfo = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  // State cho password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho chỉnh sửa profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    phone: user?.phone || "",
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // State cho địa chỉ
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Load addresses
  const loadAddresses = async () => {
    const token = user?.token || localStorage.getItem("token");
    if (!token) return;
    try {
      setLoadingAddresses(true);
      const data = await addressApi.getAddresses(token);
      setAddresses(data || []);
    } catch (err) {
      console.error("Lỗi load địa chỉ:", err);
      toast.error("Không thể tải danh sách địa chỉ");
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Load addresses on mount
  useEffect(() => {
    const token = user?.token || localStorage.getItem("token");
    if (user && token) {
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  // Handlers
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

  // Cập nhật profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    // Lấy token từ user hoặc localStorage làm fallback
    const token = user?.token || localStorage.getItem("token");

    if (!user || !token) {
      console.error("❌ Không có user hoặc token:", { user, token: token ? "có" : "không" });
      toast.error("Vui lòng đăng nhập lại");
      logout();
      navigate("/sign-in");
      return;
    }

    if (!profileForm.username.trim()) {
      toast.error("Tên không được để trống");
      return;
    }

    if (profileForm.phone && !/^0\d{9}$/.test(profileForm.phone)) {
      toast.error("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)");
      return;
    }

    try {
      setProfileSubmitting(true);
      
      console.log("🔹 Đang gửi request cập nhật profile:", {
        url: `${BASE_URL}/api/users/profile`,
        token: token ? `${token.substring(0, 20)}...` : "không có",
        data: { username: profileForm.username.trim(), phone: profileForm.phone.trim() }
      });

      const response = await axios.patch(
        `${BASE_URL}/api/users/profile`,
        {
          username: profileForm.username.trim(),
          phone: profileForm.phone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Response từ server:", response.data);

      if (response.data.success) {
        toast.success("Cập nhật thông tin thành công!");
        
        // Cập nhật context
        setUser({
          ...user,
          username: response.data.user.username,
          phone: response.data.user.phone,
        });

        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error("❌ Lỗi cập nhật profile:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const errorMessage =
        error.response?.data?.message || "Không thể cập nhật thông tin";
      toast.error(errorMessage);
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Đổi mật khẩu
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const token = user?.token || localStorage.getItem("token");

    if (!user || !token) {
      toast.error("Vui lòng đăng nhập lại để đổi mật khẩu");
      logout();
      navigate("/sign-in");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await axios.patch(
        `${BASE_URL}/api/users/change-password`,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        toast.success("Đổi mật khẩu thành công!");
        setOldPassword("");
        setNewPassword("");
        setShowPasswordForm(false);
      }
    } catch (error) {
      console.error("Lỗi đổi mật khẩu:", error);
      const errorMessage =
        error.response?.data?.message || "Đổi mật khẩu thất bại";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa địa chỉ
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này?\n\nLưu ý: Địa chỉ sẽ bị ẩn khỏi danh sách nhưng vẫn được lưu trong hệ thống để phục vụ các đơn hàng cũ.")) return;

    const token = user?.token || localStorage.getItem("token");
    try {
      await addressApi.deleteAddress(addressId, token);
      toast.success("Đã xóa địa chỉ thành công");
      await loadAddresses();
    } catch (err) {
      console.error("Lỗi xóa địa chỉ:", err);
      toast.error(err.message || "Không thể xóa địa chỉ");
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
            {/* User block */}
            <div className="profile-user-block">
              <div className="profile-avatar">
                <span>{getAvatarLetter()}</span>
              </div>
              <div className="profile-user-text">
                <h3>{getDisplayName()}</h3>
                <div className="profile-badges">
                  <span className="badge badge-member">Thành viên</span>
                </div>
                <p className="profile-email">
                  Email:{" "}
                  <span className="email-masked">{maskEmail(user.email)}</span>
                </p>
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div className="profile-info-card">
              <div className="profile-info-header">
                <h3>Thông tin cá nhân</h3>
                {!isEditingProfile && (
                  <button
                    type="button"
                    className="btn-edit-profile"
                    onClick={() => {
                      setProfileForm({
                        username: user.username || "",
                        phone: user.phone || "",
                      });
                      setIsEditingProfile(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="profile-edit-form">
                  <div className="form-group">
                    <label>Họ và tên</label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => {
                        const nextValue = e.target.value
                          .replace(/[^\p{L}\s]/gu, "")
                          .replace(/\s{2,}/g, " ");
                        setProfileForm({ ...profileForm, username: nextValue });
                      }}
                      className="password-input"
                      placeholder="Nhập họ và tên"
                      inputMode="text"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => {
                        const nextValue = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setProfileForm({ ...profileForm, phone: nextValue });
                      }}
                      className="password-input"
                      placeholder="0123456789"
                      inputMode="numeric"
                      pattern="0[0-9]{9}"
                    />
                    <p className="input-hint">
                      Số điện thoại phải có 10 số và bắt đầu bằng 0
                    </p>
                  </div>

                  <div className="password-actions">
                    <button
                      type="submit"
                      className="update-btn"
                      disabled={profileSubmitting}
                    >
                      {profileSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={profileSubmitting}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info-display">
                  <div className="info-item">
                    <span className="info-label">Họ và tên:</span>
                    <span className="info-value">{user.username || "Chưa cập nhật"}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Số điện thoại:</span>
                    <span className="info-value">{user.phone || "Chưa cập nhật"}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quản lý địa chỉ */}
            <div className="profile-address-card">
              <div className="profile-address-header">
                <h3>Địa chỉ giao hàng</h3>
                <button
                  type="button"
                  className="btn-add-address"
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressModal(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Thêm địa chỉ
                </button>
              </div>

              {loadingAddresses ? (
                <p>Đang tải...</p>
              ) : addresses.length === 0 ? (
                <p className="no-address">Chưa có địa chỉ nào. Thêm địa chỉ để nhận hàng nhanh hơn.</p>
              ) : (
                <div className="address-list">
                  {addresses.map((addr) => (
                    <div key={addr.addressId} className="address-card-item">
                      <div className="address-info">
                        <p className="address-name">
                          <strong>{addr.fullName}</strong>
                          {addr.isDefault === 1 && (
                            <span className="badge badge-default">Mặc định</span>
                          )}
                        </p>
                        <p className="address-phone">{addr.phone}</p>
                        <p className="address-detail">
                          {addr.detail}, {addr.ward}, {addr.district}, {addr.province}
                        </p>
                      </div>
                      <div className="address-actions">
                        <button
                          type="button"
                          className="btn-edit-addr"
                          onClick={() => {
                            setEditingAddress(addr);
                            setShowAddressModal(true);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn-delete-addr"
                          onClick={() => handleDeleteAddress(addr.addressId)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-view-all-addresses"
                onClick={loadAddresses}
              >
                🔄 Làm mới danh sách
              </button>
            </div>

            {/* Bảo mật */}
            <div className="profile-highlight-box">
              <h4>Bảo mật tài khoản</h4>
              <p>
                Để đảm bảo an toàn, bạn nên định kỳ thay đổi mật khẩu và không
                chia sẻ thông tin đăng nhập cho bất kỳ ai.
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
                      <strong>Yêu cầu bảo mật:</strong><br/>
                      • Tối thiểu 6 ký tự<br/>
                      • Phải có: chữ hoa (A-Z), chữ thường (a-z), số (0-9)<br/>
                      • Ví dụ: MyPass123, SecurePass2024
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
                    Bấm <strong>Mở form</strong> để thay đổi mật khẩu tài khoản
                    của bạn.
                  </p>
                </div>
              )}
            </div>

            <div className="profile-security-note">
              <p>
                Nếu bạn nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật
                khẩu ngay và liên hệ hỗ trợ của EcotechStore.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal quản lý địa chỉ */}
      {showAddressModal && (
        <ShippingAddressForm
          onAddressSelect={() => {}}
          onAddressAdded={async () => {
            await loadAddresses();
            setShowAddressModal(false);
          }}
          onClose={() => setShowAddressModal(false)}
          initialData={editingAddress}
          isAddingNew={!editingAddress}
        />
      )}
    </div>
  );
};

export default ProfileInfo;