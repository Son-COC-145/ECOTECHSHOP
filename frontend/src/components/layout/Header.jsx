// src/components/Header.jsx
import React, { useState, useCallback, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../../styles/Header.css";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import EcoTechLogo from "../common/EcoTechLogo";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, logout } = useAuth();
  const { cartItems, toggleCart } = useCart();
  const navigate = useNavigate();

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const toggleDropdown = useCallback(
    () => setDropdownOpen((prev) => !prev),
    []
  );

  const handleLogout = useCallback(() => {
    logout();
    setDropdownOpen(false);
    navigate("/");
  }, [logout, navigate]);

  const handleSearchSubmit = useCallback(
    (e) => {
      if (e.key === "Enter" && searchTerm.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        setSearchTerm("");
      }
    },
    [searchTerm, navigate]
  );

  const handleSearchInput = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const userInfo = useMemo(() => {
    if (!user || user.isGuest) return null;
    return {
      id: user.id || user.userId,
      username: user.username || "Người dùng",
    };
  }, [user]);

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <div className="logo">
            <EcoTechLogo size={40} showText={true} linkTo="/" />
          </div>

          {/* Navigation */}
          <nav className={`nav-menu ${menuOpen ? "open" : ""}`}>
            <ul>
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  Trang Chủ
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* Search */}
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="🔍 Tìm sản phẩm công nghệ, laptop, điện thoại..."
              value={searchTerm}
              onChange={handleSearchInput}
              onKeyDown={handleSearchSubmit}
              className="search-input"
            />
            {searchTerm.trim() && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                aria-label="Xóa từ khóa"
                title="Xóa"
              >
                ×
              </button>
            )}
          </div>

          {/* User actions */}
          <div className="user-actions">
            {/* Cart Icon - Hiển thị trong header */}
            <button className="header-cart-btn" onClick={toggleCart}>
              <i className="fas fa-shopping-cart"></i>
              {cartItems.length > 0 && (
                <span className="header-cart-badge">{cartItems.length}</span>
              )}
            </button>

            {userInfo ? (
              // ĐÃ ĐĂNG NHẬP → Hiển thị "Chào, tên"
              <div className="user-dropdown">
                <div className="user-info" onClick={toggleDropdown}>
                  <span className="greeting">
                    Chào,&nbsp;
                    <span className="username-highlight">
                      {userInfo.username}
                    </span>
                  </span>
                  <span
                    className={`dropdown-icon ${
                      dropdownOpen ? "open" : ""
                    }`}
                  >
                    <i className="fas fa-caret-down"></i>
                  </span>
                </div>

                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Thông tin tài khoản
                    </Link>
                    <Link
                      to="/orders"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Lịch sử mua hàng
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="dropdown-item logout-btn"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // CHƯA ĐĂNG NHẬP → Nút Đăng nhập
              <Link to="/sign-in" className="sign-in-btn">
                Đăng Nhập
              </Link>
            )}

            {/* Mobile menu button */}
            <button className="menu-toggle" onClick={toggleMenu}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;