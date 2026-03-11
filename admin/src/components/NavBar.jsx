// src/components/NavBar.jsx - Professional Admin NavBar
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import EcoTechLogo from "./EcoTechLogo";

const NavBar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ẩn Navbar trên trang đăng nhập
  if (location.pathname === "/signin") {
    return null;
  }

  const handleSignOut = () => {
    signOut();
    navigate("/signin");
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-container">
        {/* Logo & Brand */}
        <div className="admin-navbar-brand">
          <div className="admin-logo">
            <EcoTechLogo size={40} showText={true} />
          </div>
        </div>
        {/* User Menu */}
        <div className="admin-navbar-user">
          <div className="admin-user-dropdown">
            <button
              className="admin-user-button"
              onClick={toggleDropdown}
            >
              <div className="admin-user-avatar">
                {user?.username?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="admin-user-info">
                <span className="admin-user-name">{user?.username || "Admin"}</span>
                <span className="admin-user-role">Administrator</span>
              </div>
              <svg
                className={`admin-dropdown-icon ${dropdownOpen ? 'open' : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="admin-dropdown-menu">
                <div className="admin-dropdown-header">
                  <div className="admin-user-avatar-large">
                    {user?.username?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <div className="admin-user-name-large">{user?.username || "Admin"}</div>
                    <div className="admin-user-email">{user?.email || "admin@example.com"}</div>
                  </div>
                </div>
                <div className="admin-dropdown-divider"></div>
                <button className="admin-dropdown-item" onClick={() => { navigate("/profile"); setDropdownOpen(false); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                    <path d="M8 10C3.58172 10 0 13.5817 0 18H16C16 13.5817 12.4183 10 8 10Z" fill="currentColor"/>
                  </svg>
                  Thông tin cá nhân
                </button>
                <button className="admin-dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14Z" fill="currentColor"/>
                    <path d="M8 4C6.9 4 6 4.9 6 6C6 7.1 6.9 8 8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4ZM8 10C6.34 10 5 8.66 5 7C5 5.34 6.34 4 8 4C9.66 4 11 5.34 11 7C11 8.66 9.66 10 8 10Z" fill="currentColor"/>
                  </svg>
                  Cài đặt
                </button>
                <div className="admin-dropdown-divider"></div>
                <button
                  onClick={handleSignOut}
                  className="admin-dropdown-item admin-dropdown-item-danger"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H10V4H6V2Z" fill="currentColor"/>
                    <path d="M2 4H14V6H2V4Z" fill="currentColor"/>
                    <path d="M4 6V14H12V6H4Z" fill="currentColor"/>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;