import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";

const Profile = () => {
  const { user } = useAuth();

  // --- Thông tin cá nhân ---
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    phone: user?.phone || "",
  });
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // --- Đổi mật khẩu ---
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!profileForm.username.trim()) {
      setProfileMsg({ type: "error", text: "Tên không được để trống." });
      return;
    }
    setProfileLoading(true);
    try {
      const res = await api.patch("/api/users/profile", {
        username: profileForm.username.trim(),
        phone: profileForm.phone.trim(),
      });
      setProfileMsg({ type: "success", text: res.data.message || "Cập nhật thành công!" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Lỗi khi cập nhật." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "Vui lòng điền đầy đủ các trường." });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "Mật khẩu mới không khớp." });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải ít nhất 6 ký tự." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await api.patch("/api/users/change-password", {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ type: "success", text: res.data.message || "Đổi mật khẩu thành công!" });
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.message || "Lỗi khi đổi mật khẩu." });
    } finally {
      setPwLoading(false);
    }
  };

  const Alert = ({ msg }) =>
    msg ? (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
        background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
        color: msg.type === "success" ? "#15803d" : "#dc2626",
        border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
      }}>
        <span>{msg.type === "success" ? "✓" : "!"}</span>
        {msg.text}
      </div>
    ) : null;

  const SubmitBtn = ({ loading, label, loadingLabel }) => (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
        background: loading ? "#c4b5fd" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff", fontWeight: 600, fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "opacity 0.2s", letterSpacing: "0.3px",
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );

  return (
    <ProtectedRoute>
      <style>{`
        .profile-input {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
          background: #fff;
          color: #111827;
        }
        .profile-input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(129,140,248,0.15);
        }
        .profile-input:disabled {
          background: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .profile-input::placeholder {
          color: #d1d5db;
          font-size: 13px;
        }
        .profile-input[type="password"]::placeholder {
          color: #d1d5db;
          letter-spacing: 2px;
          font-size: 11px;
        }
        .profile-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .profile-card-header {
          padding: 16px 24px;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .profile-card-header h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }
        .profile-card-body {
          padding: 24px;
        }
        .profile-field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .profile-field {
          margin-bottom: 18px;
        }
        .profile-pw-wrap {
          position: relative;
        }
        .profile-pw-wrap .profile-input {
          padding-right: 42px;
        }
        .profile-pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 0;
          font-size: 15px;
          line-height: 1;
          transition: color 0.15s;
        }
        .profile-pw-toggle:hover { color: #6b7280; }
      `}</style>
      <div className="admin-dashboard-layout">
        <AdminSidebar />
        <main className="admin-main-content">
          <div className="admin-dashboard">
            <div className="admin-dashboard-header">
              <h1>Thông tin cá nhân</h1>
              <p>Quản lý tài khoản và bảo mật của bạn</p>
            </div>

            {/* Hero card */}
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 12, padding: "24px 28px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 20,
              boxShadow: "0 4px 16px rgba(102,126,234,0.35)",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                border: "2.5px solid rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {user?.username?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "#fff" }}>{user?.username || "Admin"}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>{user?.email || ""}</div>
                <span style={{
                  display: "inline-block", marginTop: 8,
                  padding: "3px 12px", borderRadius: 20,
                  background: "rgba(255,255,255,0.2)", color: "#fff",
                  fontSize: 12, fontWeight: 600, letterSpacing: "0.3px",
                }}>
                  {user?.role || "Admin"}
                </span>
              </div>
            </div>

            {/* 2-column grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

              {/* Cập nhật thông tin */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>✏️ Cập nhật thông tin</h2>
                </div>
                <div className="profile-card-body">
                  <form onSubmit={handleProfileSubmit}>
                    <div className="profile-field">
                      <label className="profile-field-label">Tên hiển thị</label>
                      <input
                        className="profile-input"
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        placeholder="Nhập tên..."
                      />
                    </div>
                    <div className="profile-field">
                      <label className="profile-field-label">Email</label>
                      <input
                        className="profile-input"
                        type="email"
                        value={user?.email || ""}
                        disabled
                      />
                    </div>
                    <div className="profile-field">
                      <label className="profile-field-label">Số điện thoại</label>
                      <input
                        className="profile-input"
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="Nhập số điện thoại..."
                      />
                    </div>
                    <Alert msg={profileMsg} />
                    <SubmitBtn loading={profileLoading} label="Lưu thay đổi" loadingLabel="Đang lưu..." />
                  </form>
                </div>
              </div>

              {/* Đổi mật khẩu */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>🔒 Đổi mật khẩu</h2>
                </div>
                <div className="profile-card-body">
                  <form onSubmit={handlePwSubmit}>
                    {[
                      { key: "old",     field: "oldPassword",     label: "Mật khẩu hiện tại",         ac: "current-password" },
                      { key: "new",     field: "newPassword",     label: "Mật khẩu mới",               ac: "new-password" },
                      { key: "confirm", field: "confirmPassword", label: "Xác nhận mật khẩu mới",      ac: "new-password" },
                    ].map(({ key, field, label, ac }) => (
                      <div key={key} className="profile-field">
                        <label className="profile-field-label">{label}</label>
                        <div className="profile-pw-wrap">
                          <input
                            className="profile-input"
                            type={showPw[key] ? "text" : "password"}
                            value={pwForm[field]}
                            onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                            placeholder="••••••••"
                            autoComplete={ac}
                          />
                          <button
                            type="button"
                            className="profile-pw-toggle"
                            onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                          >
                            {showPw[key] ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    <Alert msg={pwMsg} />
                    <SubmitBtn loading={pwLoading} label="Đổi mật khẩu" loadingLabel="Đang cập nhật..." />
                  </form>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
