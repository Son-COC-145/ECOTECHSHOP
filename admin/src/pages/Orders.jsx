import { useState, useEffect, Fragment } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminSidebar from "../components/AdminSidebar";
import { getAllOrders, updateOrderStatus, getOrderDetail } from "../services/adminService";
import "../styles/admin-dashboard.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState(() => localStorage.getItem("activeStatus") || "All");

  // ✅ pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);

  const statuses = ["All", "Pending", "Processing", "Confirmed", "Shipped", "Delivered", "Cancelled"];

  useEffect(() => {
    localStorage.setItem("activeStatus", activeStatus);
    setPage(1);
    fetchOrders(1, activeStatus);
    // eslint-disable-next-line
  }, [activeStatus]);

  useEffect(() => {
    fetchOrders(page, activeStatus);
    // eslint-disable-next-line
  }, [page]);

  const fetchOrders = async (pageArg = 1, statusArg = activeStatus) => {
  try {
    const data = await getAllOrders({ page: pageArg, limit, status: statusArg });
    
    // ✅ Kiểm tra response
    if (data?.success === false) {
      throw new Error(data.message || "Lỗi tải đơn hàng");
    }
    
    setOrders(data?.orders || []);
    setTotalPages(data?.totalPages || 1);
    setTotal(data?.total || 0);

    setSelectedOrderId(null);
    setOrderDetail(null);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    alert("Không tải được đơn hàng: " + (error.response?.data?.message || error.message));
    setOrders([]);
  }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders(page, activeStatus);
      if (orderDetail?.order?.orderId === orderId) {
        setOrderDetail({
          ...orderDetail,
          order: { ...orderDetail.order, orderStatus: newStatus },
        });
      }
    } catch (error) {
      alert("Lỗi khi cập nhật trạng thái: " + (error?.message || "Unknown error"));
    }
  };

  const fetchOrderDetail = async (orderId) => {
    const data = await getOrderDetail(orderId);
    return data;
  };

  const toggleOrderDetails = async (order) => {
    const id = Number(order?.orderId);
    if (!id) return;

    if (selectedOrderId === id) {
      setSelectedOrderId(null);
      setOrderDetail(null);
      return;
    }

    setSelectedOrderId(id);
    setDetailLoading(true);
    setOrderDetail(null);

    try {
      const data = await fetchOrderDetail(id);
      console.log("Order detail response:", data);
      
      if (data?.success === false) {
        throw new Error(data.message || "Không tìm thấy đơn hàng");
      }
      
      // Response format: { success: true, order: {...}, items: [...] }
      if (!data?.order) {
        throw new Error("Dữ liệu đơn hàng không hợp lệ");
      }
      
      setOrderDetail(data);
    } catch (e) {
      console.error("Fetch order detail error:", e);
      const errorMsg = e.response?.data?.message || e.message || "Không lấy được chi tiết đơn hàng";
      alert(errorMsg);
      setSelectedOrderId(null);
      setOrderDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "All": return "Tất cả";
      case "Pending": return "Chờ xác nhận";
      case "Processing": return "Đã xác nhận";
      case "Confirmed": return "Đã đóng gói";
      case "Shipped": return "Đang giao hàng";
      case "Delivered": return "Giao thành công";
      case "Cancelled": return "Đã hủy";
      default: return status;
    }
  };

  return (
    <ProtectedRoute>
      <div className="admin-dashboard-layout">
        <AdminSidebar />
        <main className="admin-main-content">
          <div className="admin-dashboard">
            <div className="admin-dashboard-header">
              <h1>Quản Lý Đơn Hàng</h1>
              <p style={{ opacity: 0.8, marginTop: 6 }}>
                Tổng: {total.toLocaleString()} đơn • {limit} đơn / trang
              </p>
            </div>

        <div className="status-filter">
          {statuses.map((status) => (
            <button
              key={status}
              className={activeStatus === status ? "active" : ""}
              onClick={() => setActiveStatus(status)}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>ID Đơn Hàng</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái</th>
              <th>Ngày Tạo</th>
              <th>Hành Động</th>
              <th>Chi Tiết</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => {
              const id = Number(order?.orderId);
              const status = order?.orderStatus || "Pending";

              return (
                <Fragment key={id}>
                  <tr>
                    <td>{id || "N/A"}</td>
                    <td>{Number(order?.totalPrice || 0).toLocaleString("vi-VN")}₫</td>
                    <td>{getStatusLabel(status)}</td>
                    <td>{order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "N/A"}</td>
                    <td>
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(id, e.target.value)}
                        disabled={!id}
                      >
                        <option value="Pending">Chờ xác nhận</option>
                        <option value="Processing">Đã xác nhận</option>
                        <option value="Confirmed">Đã đóng gói</option>
                        <option value="Shipped">Đang giao hàng</option>
                        <option value="Delivered">Giao thành công</option>
                        <option value="Cancelled">Đã hủy</option>
                      </select>
                    </td>
                    <td>
                      <button onClick={() => toggleOrderDetails(order)} disabled={!id}>
                        {selectedOrderId === id ? "Ẩn" : "Xem chi tiết"}
                      </button>
                    </td>
                  </tr>

                  {selectedOrderId === id && (
                    <tr>
                      <td colSpan="6">
                        <div className="order-details">
                          {detailLoading && <p>Đang tải chi tiết...</p>}

                          {!detailLoading && orderDetail?.order && (
                            <>
                              {/* Thông tin đơn hàng */}
                              <div className="order-info-section">
                                <h3 className="order-section-title">Thông tin đơn hàng</h3>
                                <div className="order-info-grid">
                                  <div className="order-info-item">
                                    <span className="order-info-label">Mã đơn hàng:</span>
                                    <span className="order-info-value">#{orderDetail.order.orderId}</span>
                                  </div>
                                  <div className="order-info-item">
                                    <span className="order-info-label">Trạng thái:</span>
                                    <span className="order-info-value">{getStatusLabel(orderDetail.order.orderStatus)}</span>
                                  </div>
                                  <div className="order-info-item">
                                    <span className="order-info-label">Tổng tiền:</span>
                                    <span className="order-info-value">
                                      {Number(orderDetail.order.totalPrice || 0).toLocaleString("vi-VN")}₫
                                    </span>
                                  </div>
                                  <div className="order-info-item">
                                    <span className="order-info-label">Ngày tạo:</span>
                                    <span className="order-info-value">
                                      {orderDetail.order.createdAt 
                                        ? new Date(orderDetail.order.createdAt).toLocaleString("vi-VN") 
                                        : "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Thông tin người nhận và địa chỉ */}
                              <div className="order-info-section">
                                <h3 className="order-section-title">Thông tin giao hàng</h3>
                                <div className="order-address-card">
                                  <div className="order-address-item">
                                    <svg className="order-address-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                      <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" stroke="currentColor" strokeWidth="1.5"/>
                                      <path d="M10 18.3333C13.3333 15 16.6667 11.5833 16.6667 7.58333C16.6667 4.15167 13.8983 1.66667 10 1.66667C6.10167 1.66667 3.33333 4.15167 3.33333 7.58333C3.33333 11.5833 6.66667 15 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                                    </svg>
                                    <div className="order-address-content">
                                      <p className="order-address-name">
                                        <strong>{orderDetail.order.fullName || "N/A"}</strong>
                                      </p>
                                      <p className="order-address-phone">
                                        📞 {orderDetail.order.phone || "N/A"}
                                      </p>
                                      <p className="order-address-full">
                                        {[
                                          orderDetail.order.detail,
                                          orderDetail.order.ward,
                                          orderDetail.order.district,
                                          orderDetail.order.province,
                                        ]
                                          .filter(Boolean)
                                          .join(", ")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Danh sách sản phẩm */}
                              <div className="order-info-section">
                                <h3 className="order-section-title">
                                  Sản phẩm ({orderDetail.items?.length || 0})
                                </h3>
                                <div className="order-products-list">
                                  {(orderDetail.items || []).map((item, idx) => (
                                    <div key={idx} className="order-product-item">
                                      <div className="order-product-image">
                                        <img
                                          src={item.image || item.fallbackImage || "/placeholder.png"}
                                          alt={item.productName || "Sản phẩm"}
                                          onError={(e) => {
                                            e.target.src = "/placeholder.png";
                                          }}
                                        />
                                      </div>
                                      <div className="order-product-info">
                                        <h4 className="order-product-name">
                                          {item.productName || `Sản phẩm #${item.productId}`}
                                        </h4>
                                        <div className="order-product-details">
                                          {item.categoryName && (
                                            <span className="order-product-category">{item.categoryName}</span>
                                          )}
                                          {item.optionName && (
                                            <span className="order-product-option">Option: {item.optionName}</span>
                                          )}
                                          {item.color && (
                                            <span className="order-product-color">Màu: {item.color}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="order-product-quantity">
                                        <span className="order-product-qty-label">Số lượng:</span>
                                        <span className="order-product-qty-value">{item.quantity || 0}</span>
                                      </div>
                                      <div className="order-product-price">
                                        <span className="order-product-price-label">Đơn giá:</span>
                                        <span className="order-product-price-value">
                                          {Number(item.unitPrice || 0).toLocaleString("vi-VN")}₫
                                        </span>
                                      </div>
                                      <div className="order-product-total">
                                        <span className="order-product-total-label">Thành tiền:</span>
                                        <span className="order-product-total-value">
                                          {Number((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString("vi-VN")}₫
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {(!orderDetail.items || orderDetail.items.length === 0) && (
                                    <div className="order-products-empty">
                                      <p>Không có sản phẩm trong đơn hàng.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {!detailLoading && !orderDetail && <p>Không có dữ liệu chi tiết.</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>
                  Không có đơn hàng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ✅ Pagination */}
            <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </button>
              <span>
                Trang {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Trang sau
              </button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  ); 
};

export default Orders;