// src/components/profile/OrderHistory.jsx
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.token) return;

      try {
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

  return (
    <>
      <div className="order-history">
        <h2>Lịch sử đơn hàng</h2>

        {orders.length > 0 ? (
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
              {orders.map((order, idx) => {
                const orderKey = order.orderId || order.id || order._id;
                const rawStatus = order.status || order.orderStatus;
                const isCompleted =
                  rawStatus === "Delivered" || rawStatus === "COMPLETED";
                const isExpanded = expandedOrderId === orderKey;

                // Địa chỉ snapshot của đơn hàng (ưu tiên order.address)
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
                    {/* Hàng tóm tắt đơn */}
                    <tr
                      className={`order-row ${
                        isExpanded ? "order-row-expanded" : ""
                      }`}
                      onClick={() => handleToggleOrder(order)}
                    >
                      <td className="index-col">{idx + 1}</td>
                      <td>{getOrderDate(order)}</td>
                      <td>{mapOrderStatus(rawStatus)}</td>
                      <td>
                        {(order.totalPrice || order.total || 0).toLocaleString(
                          "vi-VN"
                        )}{" "}
                        VND
                      </td>
                      <td>
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

                    {/* Hàng chi tiết (accordion) */}
                    {isExpanded && (
                      <tr className="order-details-row">
                        <td colSpan={5}>
                          <div className="order-details">
                            <h3>
                              Chi tiết đơn hàng{" "}
                              {order.orderId || order.id || order._id}
                            </h3>

                            <div className="order-info">
                              <p>
                                <strong>Trạng thái:</strong>{" "}
                                {mapOrderStatus(rawStatus)}
                              </p>

                              {snapshotAddress.fullName && (
                                <>
                                  <p>
                                    <strong>Địa chỉ:</strong>{" "}
                                    {snapshotAddress.fullName},{" "}
                                    {`${snapshotAddress.detail}, ${snapshotAddress.ward}, ${snapshotAddress.district}, ${snapshotAddress.province}`}
                                  </p>
                                  {snapshotAddress.phone && (
                                    <p>
                                      <strong>Số điện thoại:</strong>{" "}
                                      {snapshotAddress.phone}
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

                                    const productName =
                                      item.productName || "Sản phẩm";
                                    const productImage =
                                      item.image || item.fallbackImage;
                                    const categorySlug = "product";

                                    const unitPrice =
                                      item.unitPrice || item.price || 0;
                                    const quantity = item.quantity || 1;
                                    const lineTotal = unitPrice * quantity;

                                    return (
                                      <tr
                                        key={
                                          item.orderItemId ||
                                          `${pid}_${iIdx}`
                                        }
                                        className="product-row"
                                      >
                                        <td className="index-col">
                                          {iIdx + 1}
                                        </td>
                                        <td>
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
                                        <td>
                                          <Link
                                            to={`/product/${categorySlug}/${pid}`}
                                            className="product-link"
                                          >
                                            {productName}
                                          </Link>
                                        </td>
                                        <td>
                                          {item.optionName || item.color ? (
                                            <>
                                              {item.optionName && (
                                                <div className="variant-option">
                                                  {item.optionName}
                                                </div>
                                              )}
                                              {item.color && (
                                                <div className="variant-color">
                                                  Màu: {item.color}
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </td>
                                        <td>{quantity}</td>
                                        <td>
                                          {unitPrice.toLocaleString("vi-VN")} VND
                                        </td>
                                        <td>
                                          {lineTotal.toLocaleString("vi-VN")} VND
                                        </td>

                                        {isCompleted && (
                                          <td>
                                            <div
                                              className={`review-section ${
                                                hasReview
                                                  ? "reviewed"
                                                  : "pending-review"
                                              }`}
                                            >
                                              {hasReview && !isEditing[pid] ? (
                                                <div className="review-display">
                                                  <p className="review-status">
                                                    Đã đánh giá{" "}
                                                    <span className="check-icon">
                                                      ✓
                                                    </span>
                                                  </p>
                                                  <div className="rating-display">
                                                    {[...Array(5)].map(
                                                      (_, index) => (
                                                        <span
                                                          key={index}
                                                          className={
                                                            index <
                                                            (rating[pid] || 0)
                                                              ? "star-filled"
                                                              : "star-empty"
                                                          }
                                                        >
                                                          ★
                                                        </span>
                                                      )
                                                    )}
                                                  </div>
                                                  <p className="review-comment">
                                                    {review[pid] ||
                                                      "Không có nhận xét"}
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
                                                    {hasReview
                                                      ? "Sửa đánh giá"
                                                      : "Viết đánh giá"}
                                                  </p>
                                                  <div className="rating">
                                                    {[1, 2, 3, 4, 5].map(
                                                      (star) => (
                                                        <span
                                                          key={star}
                                                          onClick={() =>
                                                            setRating(
                                                              (prev) => ({
                                                                ...prev,
                                                                [pid]: star,
                                                              })
                                                            )
                                                          }
                                                          className={
                                                            star <=
                                                            (rating[pid] || 0)
                                                              ? "star-filled"
                                                              : "star-empty"
                                                          }
                                                        >
                                                          ★
                                                        </span>
                                                      )
                                                    )}
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
                                                    onClick={() =>
                                                      handleSubmitReview(
                                                        orderKey,
                                                        pid
                                                      )
                                                    }
                                                    className="submit-review-btn"
                                                  >
                                                    {hasReview
                                                      ? "Cập nhật"
                                                      : "Gửi"}
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
        ) : (
          <p>Chưa có đơn hàng nào</p>
        )}
      </div>
    </>
  );
};

export default OrderHistory;
