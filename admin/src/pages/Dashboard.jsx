// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import api from "../services/api";
import { getAllOrders } from "../services/adminService";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Stats from backend
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalPaidOrders: 0,
  });

  // Recent orders
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(amount || 0));

  // Fetch stats (all-time stats)
  const fetchStats = async () => {
    try {
      // Không truyền startDate và endDate để lấy toàn bộ doanh thu từ trước đến nay
      const res = await api.get("/api/orders/stats");
      const data = res.data || {};
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0, // Tổng doanh thu toàn bộ
        totalProducts: data.totalProducts || 0,
        totalCustomers: data.totalCustomers || 0,
        totalPaidOrders: data.totalPaidOrders || 0,
      });
    } catch (e) {
      console.error("fetchStats error:", e);
    }
  };

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders({ page: 1, limit: 5, status: "All" });
      setRecentOrders(data?.orders || []);
    } catch (e) {
      console.error("fetchRecentOrders error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchStats();
      fetchRecentOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getStatusLabel = (status) => {
    const labels = {
      "Pending": "Chờ xác nhận",
      "Processing": "Đã xác nhận",
      "Confirmed": "Đã đóng gói",
      "Shipped": "Đang giao hàng",
      "Delivered": "Giao thành công",
      "Cancelled": "Đã hủy",
    };
    return labels[status] || status;
  };

  return (
    <ProtectedRoute>
      <div className="admin-dashboard-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-menu">
            <button
              className={`admin-sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span>Dashboard</span>
            </button>
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/revenue" ? "active" : ""}`}
              onClick={() => {
                navigate("/revenue");
              }}
            >
              <span>Doanh thu</span>
            </button>
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/products" ? "active" : ""}`}
              onClick={() => navigate("/products")}
            >
              <span>Sản phẩm</span>
            </button>
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/orders" ? "active" : ""}`}
              onClick={() => navigate("/orders")}
            >
              <span>Đơn hàng</span>
            </button>
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/users" ? "active" : ""}`}
              onClick={() => navigate("/users")}
            >
              <span>Người dùng</span>
            </button>
          </div>
        </aside>

        <main className="admin-main-content">
          {activeTab === "dashboard" && (
            <div className="admin-dashboard">
              <div className="admin-dashboard-header">
                <h1>Dashboard</h1>
                <p style={{ opacity: 0.8, marginTop: 6 }}>
                  Tổng quan hệ thống
                </p>
              </div>

              {/* Stats Grid */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon admin-stat-icon-primary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="admin-stat-content">
                    <h3>{Number(stats.totalCustomers || 0).toLocaleString("vi-VN")}</h3>
                    <p>Tổng khách hàng</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon admin-stat-icon-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="admin-stat-content">
                    <h3>{Number(stats.totalOrders || 0).toLocaleString("vi-VN")}</h3>
                    <p>Tổng đơn hàng</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon admin-stat-icon-warning">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div className="admin-stat-content">
                    <h3>{formatCurrency(stats.totalRevenue)}</h3>
                    <p>Tổng doanh thu</p>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon admin-stat-icon-error">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <div className="admin-stat-content">
                    <h3>{Number(stats.totalProducts || 0).toLocaleString("vi-VN")}</h3>
                    <p>Tổng sản phẩm</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="admin-dashboard-section">
                <div className="admin-section-header">
                  <h2>Thao tác nhanh</h2>
                </div>
                <div className="admin-quick-actions">
                  <button
                    className="admin-quick-action-btn"
                    onClick={() => {
                      navigate("/products");
                    }}
                  >
                    <div className="admin-quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
                    </div>
                    <div className="admin-quick-action-content">
                      <h4>Quản lý sản phẩm</h4>
                      <p>Thêm, sửa, xóa sản phẩm</p>
                    </div>
                  </button>

                  <button
                    className="admin-quick-action-btn"
                    onClick={() => {
                      navigate("/orders");
                    }}
                  >
                    <div className="admin-quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                      </svg>
                    </div>
                    <div className="admin-quick-action-content">
                      <h4>Quản lý đơn hàng</h4>
                      <p>Xem và cập nhật đơn hàng</p>
                    </div>
                  </button>

                  <button
                    className="admin-quick-action-btn"
                    onClick={() => {
                      navigate("/revenue");
                    }}
                  >
                    <div className="admin-quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="2" x2="12" y2="22"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <div className="admin-quick-action-content">
                      <h4>Xem doanh thu</h4>
                      <p>Phân tích doanh thu chi tiết</p>
                    </div>
                  </button>

                  <button
                    className="admin-quick-action-btn"
                    onClick={() => {
                      navigate("/users");
                    }}
                  >
                    <div className="admin-quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="admin-quick-action-content">
                      <h4>Quản lý người dùng</h4>
                      <p>Xem và chỉnh sửa người dùng</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="admin-dashboard-section">
                <div className="admin-section-header">
                  <h2>Đơn hàng gần đây</h2>
                  <button
                    onClick={() => navigate("/orders")}
                    className="btn-view-all"
                  >
                    Xem tất cả
                  </button>
                </div>
                {loading ? (
                  <p>Đang tải...</p>
                ) : (
                  <div className="recent-orders-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Khách hàng</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                          <th>Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length > 0 ? (
                          recentOrders.map((order) => (
                            <tr key={order.orderId}>
                              <td>#{order.orderId}</td>
                              <td>{order.username || order.fullName || "N/A"}</td>
                              <td>{formatCurrency(order.totalPrice)}</td>
                              <td>
                                <span className={`status-badge status-${order.orderStatus?.toLowerCase()}`}>
                                  {getStatusLabel(order.orderStatus)}
                                </span>
                              </td>
                              <td>
                                {order.createdAt
                                  ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                                  : "N/A"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                              Chưa có đơn hàng nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;