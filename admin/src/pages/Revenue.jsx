// src/pages/Revenue.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import api from "../services/api";
import { Chart } from "chart.js/auto";
import "../styles/admin-dashboard.css";

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const Revenue = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0, // Tổng doanh thu toàn bộ (không phụ thuộc filter)
    totalProducts: 0,
    totalCustomers: 0,
    totalPaidOrders: 0,
  });
  
  const [filteredStats, setFilteredStats] = useState({
    totalOrders: 0,
    totalRevenue: 0, // Doanh thu trong khoảng thời gian đã chọn
    totalPaidOrders: 0,
  });

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return toYMD(new Date(now.getFullYear(), 0, 1));
  });
  const [endDate, setEndDate] = useState(() => toYMD(new Date()));

  const [revType, setRevType] = useState("range");
  const [revYear, setRevYear] = useState(() => new Date().getFullYear());
  const [revMonth, setRevMonth] = useState(() => new Date().getMonth() + 1);

  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  const chartRef = useRef(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(amount || 0));

  // Lấy tổng doanh thu toàn bộ (không có filter)
  const fetchTotalStats = async () => {
    try {
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
      console.error("fetchTotalStats error:", e);
    }
  };

  // Lấy doanh thu trong khoảng thời gian đã chọn
  const fetchFilteredStats = async () => {
    try {
      const res = await api.get("/api/orders/stats", { params: { startDate, endDate } });
      const data = res.data || {};
      setFilteredStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        totalPaidOrders: data.totalPaidOrders || 0,
      });
    } catch (e) {
      console.error("fetchFilteredStats error:", e);
    }
  };

  const fetchRevenueSeries = async () => {
    try {
      if (revType === "range") return null;

      const params = { type: revType };
      if (revType === "month" || revType === "day") {
        params.year = Number(revYear) || new Date().getFullYear();
      }
      if (revType === "day") {
        params.month = Number(revMonth) || 1;
      }

      console.log("Fetching revenue series with params:", params);
      const res = await api.get("/api/orders/revenue-by-time", { params });
      console.log("Revenue series response:", res.data);
      
      if (res.data?.success === false) {
        throw new Error(res.data.message || "Lỗi khi lấy dữ liệu");
      }
      
      // Response format: { success: true, data: [...] }
      const data = res.data?.data;
      if (!Array.isArray(data)) {
        console.warn("Expected array but got:", typeof data, data);
        return [];
      }
      
      console.log("Parsed revenue series:", data);
      console.log("Number of items:", data.length);
      
      // ✅ Debug: Log từng item nếu là month
      if (revType === "month") {
        console.log("Month data:", data.map(x => ({ month: x.month, revenue: x.revenue, year: x.year })));
      }
      
      return data;
    } catch (e) {
      console.error("fetchRevenueSeries error:", e);
      console.error("Error details:", {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status
      });
      const errorMsg = e.response?.data?.message || e.message || "Không thể tải dữ liệu";
      setChartError(errorMsg);
      return [];
    }
  };

  // Lấy tổng doanh thu toàn bộ khi component mount
  useEffect(() => {
    fetchTotalStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lấy doanh thu trong khoảng thời gian khi filter thay đổi
  useEffect(() => {
    fetchFilteredStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    if (!chartRef.current) return;

    const run = async () => {
      setChartLoading(true);
      setChartError(null);

      try {
        const ctx = chartRef.current.getContext("2d");
        if (!ctx) {
          console.error("Cannot get canvas context");
          setChartError("Không thể khởi tạo biểu đồ");
          return;
        }

        const existing = Chart.getChart(ctx);
        if (existing) {
          existing.destroy();
        }

        let labels = [];
        let dataPoints = [];
        let title = "VNĐ";

        if (revType === "range") {
          labels = ["Doanh thu"];
          dataPoints = [Number(filteredStats.totalRevenue || 0)];
          title = `VNĐ (${startDate} → ${endDate})`;
        } else {
          const series = await fetchRevenueSeries();

          if (revType === "year") {
            labels = (series || []).map((x) => String(x.year || "N/A"));
            dataPoints = (series || []).map((x) => Number(x.revenue || 0));
            title = "VNĐ theo năm";
          }

          if (revType === "month") {
            console.log("Processing month data, series:", series);
            labels = (series || []).map((x) => {
              const monthNum = x.month;
              if (!monthNum || monthNum < 1 || monthNum > 12) {
                console.warn("Invalid month:", x);
                return `Tháng N/A`;
              }
              return `Tháng ${monthNum}`;
            });
            dataPoints = (series || []).map((x) => {
              const revenue = Number(x.revenue || 0);
              console.log(`Month ${x.month}: revenue = ${revenue}`);
              return revenue;
            });
            title = `VNĐ theo tháng (${revYear})`;
            
            // ✅ Debug: Log final labels and dataPoints
            console.log("Final labels:", labels);
            console.log("Final dataPoints:", dataPoints);
            console.log("Labels length:", labels.length, "DataPoints length:", dataPoints.length);
          }

          if (revType === "day") {
            labels = (series || []).map((x) => {
              if (x.date) {
                const dateStr = String(x.date);
                // Handle both Date objects and date strings
                if (dateStr.includes("T")) {
                  return dateStr.slice(0, 10);
                }
                return dateStr.slice(0, 10);
              }
              return `Ngày ${x.day || "N/A"}`;
            });
            dataPoints = (series || []).map((x) => Number(x.revenue || 0));
            title = `VNĐ theo ngày (${revYear}-${pad2(revMonth)})`;
          }

          if (!labels.length || labels.every(l => !l)) {
            labels = ["Không có dữ liệu"];
            dataPoints = [0];
            if (!chartError) {
              setChartError("Không có dữ liệu cho khoảng thời gian này");
            }
          }
        }

        // ✅ Đảm bảo có dữ liệu trước khi tạo chart
        if (labels.length === 0 || dataPoints.length === 0) {
          console.warn("No data to display");
          setChartError("Không có dữ liệu để hiển thị");
          return;
        }

        console.log("Creating chart with:", { labels, dataPoints, title });

        // ✅ Tạo gradient cho biểu đồ
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, "rgba(102, 126, 234, 0.8)");
        gradient.addColorStop(0.5, "rgba(118, 75, 162, 0.7)");
        gradient.addColorStop(1, "rgba(102, 126, 234, 0.5)");

        // ✅ Tạo gradient cho border
        const borderGradient = ctx.createLinearGradient(0, 0, 0, 400);
        borderGradient.addColorStop(0, "#667eea");
        borderGradient.addColorStop(1, "#764ba2");

        // ✅ Tạo màu cho từng bar (nếu có nhiều bars)
        const getBarColor = (index, total) => {
          const ratio = total > 1 ? index / (total - 1) : 0;
          const r1 = 102 + Math.floor((118 - 102) * ratio);
          const g1 = 126 + Math.floor((75 - 126) * ratio);
          const b1 = 234 + Math.floor((162 - 234) * ratio);
          return `rgba(${r1}, ${g1}, ${b1}, 0.75)`;
        };

        const barColors = dataPoints.map((_, index) => getBarColor(index, dataPoints.length));
        const borderColors = dataPoints.map((_, index) => {
          const ratio = dataPoints.length > 1 ? index / (dataPoints.length - 1) : 0;
          const r1 = 102 + Math.floor((118 - 102) * ratio);
          const g1 = 126 + Math.floor((75 - 126) * ratio);
          const b1 = 234 + Math.floor((162 - 234) * ratio);
          return `rgb(${r1}, ${g1}, ${b1})`;
        });

        // ✅ Tạo chart với delay nhỏ để đảm bảo canvas đã sẵn sàng
        setTimeout(() => {
          try {
            new Chart(ctx, {
              type: "bar",
              data: {
                labels,
                datasets: [
                  {
                    label: title,
                    data: dataPoints,
                    backgroundColor: dataPoints.length > 12 ? gradient : barColors,
                    borderColor: dataPoints.length > 12 ? "#667eea" : borderColors,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: "rgba(0, 0, 0, 0.05)",
                      drawBorder: false,
                    },
                    ticks: {
                      color: "#525252",
                      font: {
                        size: 11,
                        weight: "500",
                      },
                      callback: function (value) {
                        return new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          notation: "compact",
                        }).format(value);
                      },
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: "#525252",
                      font: {
                        size: 11,
                        weight: "500",
                      },
                      maxRotation: 45,
                      minRotation: 0,
                    },
                  },
                },
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                    labels: {
                      color: "#262626",
                      font: {
                        size: 12,
                        weight: "600",
                      },
                      padding: 15,
                      usePointStyle: true,
                    },
                  },
                  tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    padding: 12,
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "#667eea",
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                      label: function (context) {
                        return formatCurrency(context.parsed.y);
                      },
                      title: function (context) {
                        return context[0].label;
                      },
                    },
                  },
                },
              },
            });
          console.log("Chart created successfully");
          setChartLoading(false);
          } catch (chartError) {
            console.error("Error creating chart:", chartError);
            setChartError("Lỗi khi vẽ biểu đồ: " + chartError.message);
            setChartLoading(false);
          }
        }, 100);
      } catch (error) {
        console.error("Chart render error:", error);
        setChartError("Lỗi khi vẽ biểu đồ: " + (error.message || "Unknown error"));
        setChartLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStats.totalRevenue, revType, revYear, revMonth, startDate, endDate]);

  return (
    <ProtectedRoute>
      <div className="admin-dashboard-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-menu">
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/dashboard" || window.location.pathname === "/" ? "active" : ""}`}
              onClick={() => navigate("/dashboard")}
            >
              <span>Dashboard</span>
            </button>
            <button
              className={`admin-sidebar-item ${window.location.pathname === "/revenue" ? "active" : ""}`}
              onClick={() => navigate("/revenue")}
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
          <div className="admin-dashboard">
            <div className="admin-dashboard-header">
              <h1>Doanh Thu</h1>
              <p style={{ opacity: 0.8, marginTop: 6 }}>Phân tích doanh thu chi tiết</p>
            </div>

            {/* Stats Summary */}
            <div className="admin-stats-grid">
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
                <div className="admin-stat-icon admin-stat-icon-success">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div className="admin-stat-content">
                  <h3>{Number(stats.totalOrders || 0).toLocaleString("vi-VN")}</h3>
                  <p>Tổng đơn hàng</p>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon admin-stat-icon-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="admin-stat-content">
                  <h3>{Number(stats.totalPaidOrders || 0).toLocaleString("vi-VN")}</h3>
                  <p>Đơn đã thanh toán</p>
                </div>
              </div>
            </div>

            {/* Chart Filters */}
            <div className="revenue-filters">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <b>Loại biểu đồ:</b>
                <select
                  value={revType}
                  onChange={(e) => setRevType(e.target.value)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="range">Theo khoảng ngày</option>
                  <option value="year">Theo năm</option>
                  <option value="month">Theo tháng</option>
                  <option value="day">Theo ngày</option>
                </select>

                {(revType === "month" || revType === "day") && (
                  <>
                    <label>Năm:</label>
                    <input
                      type="number"
                      value={revYear}
                      onChange={(e) => setRevYear(Number(e.target.value))}
                      style={{ width: 90, padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
                    />
                  </>
                )}

                {revType === "day" && (
                  <>
                    <label>Tháng:</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={revMonth}
                      onChange={(e) => setRevMonth(Number(e.target.value))}
                      style={{ width: 70, padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
                    />
                  </>
                )}
              </div>

              {revType === "range" && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <label>Ngày bắt đầu:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
                  />
                  <label>Ngày kết thúc:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
                  />
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem", background: "white", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)", minHeight: "400px", position: "relative" }}>
              {chartLoading && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.9)", zIndex: 10 }}>
                  <p>Đang tải dữ liệu...</p>
                </div>
              )}
              {chartError && !chartLoading && (
                <div style={{ padding: "1rem", background: "#fee2e2", color: "#dc2626", borderRadius: "0.5rem", marginBottom: "1rem" }}>
                  <p><strong>Lỗi:</strong> {chartError}</p>
                </div>
              )}
              <canvas 
                ref={chartRef} 
                style={{ 
                  width: "100%", 
                  height: "400px",
                  display: chartLoading ? "none" : "block"
                }} 
              />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Revenue;