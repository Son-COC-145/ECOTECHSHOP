// src/components/AdminSidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-menu">
        <button
          className={`admin-sidebar-item ${location.pathname === "/dashboard" || location.pathname === "/" ? "active" : ""}`}
          onClick={() => navigate("/dashboard")}
        >
          <span>Dashboard</span>
        </button>
        <button
          className={`admin-sidebar-item ${location.pathname === "/revenue" ? "active" : ""}`}
          onClick={() => navigate("/revenue")}
        >
          <span>Doanh thu</span>
        </button>
        <button
          className={`admin-sidebar-item ${location.pathname === "/products" ? "active" : ""}`}
          onClick={() => navigate("/products")}
        >
          <span>Sản phẩm</span>
        </button>
        <button
          className={`admin-sidebar-item ${location.pathname === "/orders" ? "active" : ""}`}
          onClick={() => navigate("/orders")}
        >
          <span>Đơn hàng</span>
        </button>
        <button
          className={`admin-sidebar-item ${location.pathname === "/users" ? "active" : ""}`}
          onClick={() => navigate("/users")}
        >
          <span>Người dùng</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;