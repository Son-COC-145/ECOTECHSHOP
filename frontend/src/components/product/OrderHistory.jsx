// src/components/profile/OrderHistory.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { apiConfig } from "../../config/api";
import "../../styles/OrderHistory.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const OrderHistory = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [rating, setRating] = useState({});
  const [review, setReview] = useState({});
  const [existingReviews, setExistingReviews] = useState({});
  const [isEditing, setIsEditing] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(false);

  const mapOrderStatus = (status) => {
    switch (status) {
      case "Pending":
        return "Chờ xác nhận";
      case "Processing":
        return "Đã xác nhận";
      case "Confirmed":
        return "Đã đóng gói";
      case "Shipped":
        return "Đang giao hàng";
      case "Delivered":
      case "COMPLETED":
        return "Hoàn tất";
      case "Cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const getOrderDate = (order) => {
    const createdAt =
      order.createdAt ||
      order.orderDate ||
      order.created_at ||
      order.date;
    if (!createdAt) return "";
    return new Date(createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderTimestamp = (order) => {
    const createdAt =
      order.createdAt ||
      order.orderDate ||
      order.created_at ||
      order.date;

    const timestamp = createdAt ? new Date(createdAt).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const getOrderTotal = (order) =>
    Number(order.totalPrice || order.total || 0) || 0;

  const formatVND = (value) => {
    const amount = Math.round(Number(value) || 0);
    return `${amount.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}đ`;
  };

  const normalizeOrderStatus = (status) => {
    const raw = String(status || "").toLowerCase();
    if (raw === "pending") return "pending";
    if (raw === "processing") return "processing";
    if (raw === "confirmed") return "confirmed";
    if (raw === "shipped") return "shipped";
    if (raw === "delivered" || raw === "completed") return "completed";
    if (raw === "cancelled" || raw === "canceled") return "cancelled";
    return "other";
  };

  const getStatusMeta = (status) => {
    const normalized = normalizeOrderStatus(status);
    return {
      label: mapOrderStatus(status),
      className: `status-badge status-${normalized}`,
    };
  };

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let list = [...orders];

    if (query) {
      list = list.filter((order) => {
        const orderKey = String(order.orderId || order.id || order._id || "").toLowerCase();
        const statusText = mapOrderStatus(order.status || order.orderStatus)
          .toLowerCase();
        const productText = (order.items || [])
          .map((item) => item.productName || "")
          .join(" ")
          .toLowerCase();

        return (
          orderKey.includes(query) ||
          statusText.includes(query) ||
          productText.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((order) => {
        const normalized = normalizeOrderStatus(order.status || order.orderStatus);
        return normalized === statusFilter;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "oldest") {
        return getOrderTimestamp(a) - getOrderTimestamp(b);
      }

      if (sortBy === "total-desc") {
        return getOrderTotal(b) - getOrderTotal(a);
      }

      if (sortBy === "total-asc") {
        return getOrderTotal(a) - getOrderTotal(b);
      }

      return getOrderTimestamp(b) - getOrderTimestamp(a);
    });

    return list;
  }, [orders, searchQuery, sortBy, statusFilter]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.token) return;

      try {
        setIsLoading(true);
        const response = await axios.get(`${BASE_URL}/api/orders/me`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        console.log("🔍 Orders API response:", response.data);

        const raw = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.orders)
          ? response.data.orders
          : [];

        setOrders(raw);
      } catch (error) {
        console.error(
          "Lỗi khi lấy đơn hàng:",
          error.response?.data || error.message
        );
        if (error.response?.status === 401) {
          logout();
          navigate("/sign-in");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, logout, navigate]);

  const fetchExistingReview = async (productId) => {
    if (!user?.token) return;

    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/reviews/user/product/${productId}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      const reviewData = data.review || data;
      setRating((prev) => ({ ...prev, [productId]: reviewData.rating }));
      setReview((prev) => ({ ...prev, [productId]: reviewData.comment }));
      setExistingReviews((prev) => ({
        ...prev,
        [productId]: true,
      }));
    } catch {
      setExistingReviews((prev) => ({
        ...prev,
        [productId]: false,
      }));
    }
  };

  const handleSubmitReview = async (orderId, productId) => {
    if (!user?.token) return;

    // Convert sang number để gửi API
    const orderIdNum = Number(orderId);
    const productIdNum = Number(productId);
    
    // Lấy rating và comment từ state (dùng productId gốc làm key)
    const currentRating = Number(rating[productId] || 0);
    const currentComment = review[productId] || "";

    // Validate rating
    if (!currentRating || currentRating < 1 || currentRating > 5) {
      toast.error("Vui lòng chọn số sao đánh giá (1-5 sao)", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/reviews`,
        {
          orderId: orderIdNum,
          productId: productIdNum,
          rating: currentRating,
          comment: currentComment,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      toast.success("Đánh giá đã được gửi!", {
        position: "top-right",
        autoClose: 3000,
      });

      const reviewKey = productIdNum;
      setExistingReviews((prev) => ({
        ...prev,
        [reviewKey]: true,
      }));
      setIsEditing((prev) => ({ ...prev, [productId]: false }));
      
      // Reload existing review để cập nhật UI
      await fetchExistingReview(productIdNum);
    } catch (error) {
      console.error(
        "Lỗi khi gửi đánh giá:",
        error.response?.data || error.message
      );
      if (error.response?.status === 401) {
        logout();
        navigate("/sign-in");
      } else {
        const errorMessage = error.response?.data?.message || "Lỗi khi gửi đánh giá";
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 4000,
        });
      }
    }
  };

  const handleToggleOrder = (order) => {
    const orderKey = order.orderId || order.id || order._id;
    const isSame = expandedOrderId === orderKey;

    if (isSame) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderKey);

    // Lấy review cho từng sản phẩm (không cần orderId)
    (order.items || []).forEach((item) => {
      const pid = item.productId;
      if (pid) {
        fetchExistingReview(pid);
      }
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("newest");
  };

  const handleRatingKeyDown = (e, productId, star) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setRating((prev) => ({ ...prev, [productId]: star }));
      return;
    }

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setRating((prev) => ({
        ...prev,
        [productId]: Math.min((prev[productId] || 0) + 1, 5),
      }));
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setRating((prev) => ({
        ...prev,
        [productId]: Math.max((prev[productId] || 0) - 1, 1),
      }));
    }
  };

  return (
    <>
      <div className="order-history">
        <h2>Lịch sử đơn hàng</h2>

        <div className="order-toolbar">
          <div className="order-search-box">
            <input
              type="text"
              className="order-search-input"
              placeholder="Tìm theo mã đơn, trạng thái, tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm đơn hàng"
            />
          </div>

          <div className="order-sort-box">
            <select
              className="order-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp đơn hàng"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="total-desc">Tổng tiền: cao đến thấp</option>
              <option value="total-asc">Tổng tiền: thấp đến cao</option>
            </select>
          </div>

          <div className="order-status-box">
            <select
              className="order-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc trạng thái đơn hàng"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="processing">Đã xác nhận</option>
              <option value="confirmed">Đã đóng gói</option>
              <option value="shipped">Đang giao hàng</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {(searchQuery.trim() || sortBy !== "newest" || statusFilter !== "all") && (
            <button
              type="button"
              className="order-clear-btn"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <p className="order-count">
          Hiển thị {visibleOrders.length}/{orders.length} đơn hàng
        </p>

        {isLoading && (
          <div className="order-skeleton-list" aria-live="polite" aria-busy="true">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="order-skeleton-card">
                <div className="skeleton-line skeleton-line-sm" />
                <div className="skeleton-line skeleton-line-md" />
                <div className="skeleton-line skeleton-line-lg" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="empty-order-state">
            <p className="empty-order-message">Bạn chưa có đơn hàng nào.</p>
            <button
              type="button"
              className="empty-order-cta"
              onClick={() => navigate("/")}
            >
              Mua sắm ngay
            </button>
          </div>
        )}

        {!isLoading && orders.length > 0 && visibleOrders.length === 0 && (
          <p className="empty-order-message">
            Không tìm thấy đơn hàng phù hợp với từ khóa hiện tại.
          </p>
        )}

        {!isLoading && visibleOrders.length > 0 && (
          <div className="order-table-wrap">
            <table className="order-table">
            <thead>
              <tr>
                <th className="index-col">STT</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order, idx) => {
                const orderKey = order.orderId || order.id || order._id;
                const rawStatus = order.status || order.orderStatus;
                const statusMeta = getStatusMeta(rawStatus);
                const isCompleted =
                  rawStatus === "Delivered" || rawStatus === "COMPLETED";
                const isExpanded = expandedOrderId === orderKey;

                const snapshotAddress = order.address || {
                  fullName: order.fullName,
                  phone: order.phone,
                  detail: order.detail,
                  ward: order.ward,
                  district: order.district,
                  province: order.province,
                };

                return (
                  <React.Fragment key={orderKey}>
                    <tr
                      className={`order-row ${
                        isExpanded ? "order-row-expanded" : ""
                      }`}
                      onClick={() => handleToggleOrder(order)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleOrder(order);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                    >
                      <td className="index-col" data-label="STT">{idx + 1}</td>
                      <td data-label="Ngày đặt">{getOrderDate(order)}</td>
                      <td>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td data-label="Tổng tiền">
                        {formatVND(order.totalPrice || order.total || 0)}
                      </td>
                      <td data-label="Chi tiết">
                        <button
                          type="button"
                          className="view-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOrder(order);
                          }}
                        >
                          {isExpanded ? "Thu gọn" : "Xem"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="order-details-row">
                        <td colSpan={5}>
                          <div className="order-details">
                            <h3>
                              Chi tiết đơn hàng {order.orderId || order.id || order._id}
                            </h3>

                            <div className="order-info">
                              <p>
                                <strong>Trạng thái:</strong>{" "}
                                <span className={statusMeta.className}>{statusMeta.label}</span>
                              </p>

                              {snapshotAddress.fullName && (
                                <>
                                  <p>
                                    <strong>Địa chỉ:</strong> {snapshotAddress.fullName},{" "}
                                    {`${snapshotAddress.detail}, ${snapshotAddress.ward}, ${snapshotAddress.district}, ${snapshotAddress.province}`}
                                  </p>
                                  {snapshotAddress.phone && (
                                    <p>
                                      <strong>Số điện thoại:</strong> {snapshotAddress.phone}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="products-list">
                              <h4>Sản phẩm trong đơn hàng</h4>

                              <table className="product-table">
                                <thead>
                                  <tr>
                                    <th className="index-col">STT</th>
                                    <th>Hình ảnh</th>
                                    <th>Tên sản phẩm</th>
                                    <th>Phân loại</th>
                                    <th>Số lượng</th>
                                    <th>Giá</th>
                                    <th>Thành tiền</th>
                                    {isCompleted && <th>Đánh giá</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(order.items || []).map((item, iIdx) => {
                                    const pid = item.productId;
                                    const key = pid;
                                    const hasReview = existingReviews[key];

                                    const productName = item.productName || "Sản phẩm";
                                    const productImage = item.image || item.fallbackImage;
                                    const categorySlug = "product";

                                    const unitPrice = item.unitPrice || item.price || 0;
                                    const quantity = item.quantity || 1;
                                    const lineTotal = unitPrice * quantity;

                                    return (
                                      <tr
                                        key={item.orderItemId || `${pid}_${iIdx}`}
                                        className="product-row"
                                      >
                                        <td className="index-col" data-label="STT">{iIdx + 1}</td>
                                        <td data-label="Hình ảnh">
                                          {productImage ? (
                                            <Link
                                              to={`/product/${categorySlug}/${pid}`}
                                              className="product-link"
                                            >
                                              <img
                                                src={productImage}
                                                alt={productName}
                                                className="product-image"
                                              />
                                            </Link>
                                          ) : (
                                            <span>Không có ảnh</span>
                                          )}
                                        </td>
                                        <td data-label="Tên sản phẩm">
                                          <Link
                                            to={`/product/${categorySlug}/${pid}`}
                                            className="product-link"
                                          >
                                            {productName}
                                          </Link>
                                        </td>
                                        <td data-label="Phân loại">
                                          {item.optionName || item.color ? (
                                            <>
                                              {item.optionName && (
                                                <div className="variant-option">{item.optionName}</div>
                                              )}
                                              {item.color && (
                                                <div className="variant-color">Màu: {item.color}</div>
                                              )}
                                            </>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </td>
                                        <td data-label="Số lượng">{quantity}</td>
                                        <td data-label="Giá">{formatVND(unitPrice)}</td>
                                        <td data-label="Thành tiền">{formatVND(lineTotal)}</td>

                                        {isCompleted && (
                                          <td data-label="Đánh giá">
                                            <div
                                              className={`review-section ${
                                                hasReview ? "reviewed" : "pending-review"
                                              }`}
                                            >
                                              {hasReview && !isEditing[pid] ? (
                                                <div className="review-display">
                                                  <p className="review-status">
                                                    Đã đánh giá <span className="check-icon">✓</span>
                                                  </p>
                                                  <div className="rating-display">
                                                    {[...Array(5)].map((_, index) => (
                                                      <span
                                                        key={index}
                                                        className={
                                                          index < (rating[pid] || 0)
                                                            ? "star-filled"
                                                            : "star-empty"
                                                        }
                                                      >
                                                        ★
                                                      </span>
                                                    ))}
                                                  </div>
                                                  <p className="review-comment">
                                                    {review[pid] || "Không có nhận xét"}
                                                  </p>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setIsEditing((prev) => ({
                                                        ...prev,
                                                        [pid]: true,
                                                      }))
                                                    }
                                                    className="edit-review-btn"
                                                  >
                                                    Sửa đánh giá
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <p className="review-status">
                                                    {hasReview ? "Sửa đánh giá" : "Viết đánh giá"}
                                                  </p>
                                                  <div className="rating" role="radiogroup" aria-label="Đánh giá sao">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                      <span
                                                        key={star}
                                                        onClick={() =>
                                                          setRating((prev) => ({
                                                            ...prev,
                                                            [pid]: star,
                                                          }))
                                                        }
                                                        onKeyDown={(e) =>
                                                          handleRatingKeyDown(e, pid, star)
                                                        }
                                                        className={
                                                          star <= (rating[pid] || 0)
                                                            ? "star-filled"
                                                            : "star-empty"
                                                        }
                                                        role="radio"
                                                        aria-label={`${star} sao`}
                                                        aria-checked={star === (rating[pid] || 0)}
                                                        tabIndex={0}
                                                      >
                                                        ★
                                                      </span>
                                                    ))}
                                                  </div>
                                                  <textarea
                                                    value={review[pid] || ""}
                                                    onChange={(e) =>
                                                      setReview((prev) => ({
                                                        ...prev,
                                                        [pid]: e.target.value,
                                                      }))
                                                    }
                                                    placeholder="Viết nhận xét của bạn..."
                                                    className="review-textarea"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSubmitReview(orderKey, pid)}
                                                    className="submit-review-btn"
                                                  >
                                                    {hasReview ? "Cập nhật" : "Gửi"}
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderHistory;
