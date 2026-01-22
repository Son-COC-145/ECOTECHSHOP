import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "../../styles/Payment.css";

// Map mã lỗi → thông báo thân thiện hơn
const errorMessages = {
  "01": "Giao dịch không thành công. Vui lòng kiểm tra lại thông tin.",
  "02": "Ngân hàng từ chối giao dịch. Bạn vui lòng thử lại hoặc dùng thẻ khác.",
  "07": "Thẻ/ tài khoản bị khóa hoặc hạn chế. Vui lòng liên hệ ngân hàng.",
  "09": "Giao dịch không thành công. Vui lòng thử lại sau.",
  "24": "Bạn đã huỷ giao dịch.",
  "51": "Tài khoản không đủ số dư.",
  "65": "Ngân hàng hạn chế giao dịch. Vui lòng liên hệ ngân hàng.",
  DEFAULT: "Giao dịch thất bại. Vui lòng thử lại hoặc chọn phương thức khác.",
};

const PaymentFailure = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orderDetails, setOrderDetails] = useState(null);

  const params = new URLSearchParams(search);
  const txnRef =
    params.get("txnRef") ||
    params.get("transactionNo") ||
    params.get("vnp_TxnRef") ||
    params.get("vnp_TransactionNo");
  const responseCode =
    params.get("responseCode") || params.get("vnp_ResponseCode");

  const errorMessage =
    errorMessages[responseCode] || errorMessages.DEFAULT;

  useEffect(() => {
    if (!txnRef || !responseCode) {
      // Không có thông tin gì rõ ràng → quay lại giỏ
      setTimeout(() => navigate("/cart"), 2500);
      return;
    }

    const loadOrderInfo = async () => {
      try {
        // 1. Thử lấy từ localStorage (pendingOrder)
        const pendingRaw = localStorage.getItem("pendingOrder");
        if (pendingRaw) {
          try {
            const pendingOrder = JSON.parse(pendingRaw);
            if (
              pendingOrder &&
              Array.isArray(pendingOrder.items) &&
              pendingOrder.items.length > 0
            ) {
              setOrderDetails({
                items: pendingOrder.items,
                total: pendingOrder.totalPrice || 0,
                address: pendingOrder.address || null,
              });
              return;
            }
          } catch (e) {
            console.warn("Không parse được pendingOrder:", e);
          }
        }

        // 2. Một số trường hợp backend vẫn tạo order, có thể thử lấy
        if (user?.token && txnRef) {
          const baseUrl =
            process.env.REACT_APP_API_URL || "http://localhost:5000";
          try {
            const res = await axios.get(
              `${baseUrl}/api/orders/by-transaction/${txnRef}`,
              {
                headers: { Authorization: `Bearer ${user.token}` },
              }
            );
            if (res.data) {
              setOrderDetails(res.data);
              return;
            }
          } catch (err) {
            console.log(
              "Không lấy được đơn hàng từ API (có thể do thanh toán thất bại nên không tạo đơn):",
              err.response?.data || err.message
            );
          }
        }
      } finally {
        localStorage.removeItem("pendingOrder");
      }
    };

    loadOrderInfo();
  }, [txnRef, responseCode, navigate, user]);

  const items = orderDetails?.items || [];
  const total =
    orderDetails?.total ?? orderDetails?.totalPrice ?? 0;
  const address = orderDetails?.address || {};

  return (
    <div className="payment-container">
      <h2 className="payment-title error">Thanh toán thất bại</h2>

      {txnRef && responseCode ? (
        <>
          <p className="error-message">{errorMessage}</p>
          <p>
            Mã đơn hàng / giao dịch:{" "}
            <strong>{txnRef}</strong>
          </p>
          <p>
            Mã lỗi: <strong>{responseCode}</strong>
          </p>

          {orderDetails && (
            <>
              <div className="order-summary">
                <h3>Chi tiết đơn hàng (tạm tính)</h3>
                <div className="order-items">
                  {items.map((item) => {
                    const productName =
                      item.productName || item.name || "Sản phẩm";
                    const quantity = item.quantity || item.qty || 1;
                    const unitPrice =
                      item.unitPrice || item.price || 0;
                    const sizeLabel = item.size || item.optionName;
                    const colorLabel = item.color;

                    return (
                      <div
                        key={`${item.productId || item.id}-${sizeLabel || ""}`}
                        className="order-item"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={productName}
                            className="order-item-image"
                          />
                        )}
                        <div className="order-item-details">
                          <p>
                            <strong>{productName}</strong>
                          </p>
                          {sizeLabel && (
                            <p>Phân loại: {sizeLabel}</p>
                          )}
                          {colorLabel && (
                            <p>Màu sắc: {colorLabel}</p>
                          )}
                          <p>Số lượng: {quantity}</p>
                          <p>
                            Đơn giá:{" "}
                            {unitPrice.toLocaleString("vi-VN")}đ
                          </p>
                          <p>
                            Tổng:{" "}
                            {(unitPrice * quantity).toLocaleString(
                              "vi-VN"
                            )}
                            đ
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="order-total">
                  <p>
                    Tổng tạm tính ({items.length} sản phẩm):{" "}
                    <strong>
                      {total.toLocaleString("vi-VN")}đ
                    </strong>
                  </p>
                </div>
              </div>

              <div className="shipping-address">
                <h3>Địa chỉ giao hàng (nếu đã nhập)</h3>
                {address?.fullName && (
                  <p>
                    <strong>{address.fullName}</strong>{" "}
                    {address.phone && `(${address.phone})`}
                  </p>
                )}
                {address?.address && <p>{address.address}</p>}
                {!address?.address &&
                  (address.detail ||
                    address.ward ||
                    address.district ||
                    address.province) && (
                    <p>
                      {address.detail},{" "}
                      {address.ward}, {address.district},{" "}
                      {address.province}
                    </p>
                  )}
              </div>
            </>
          )}

          <div className="payment-actions">
            <button
              onClick={() => navigate("/cart")}
              className="payment-btn"
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="error-message">
            Thông tin giao dịch không hợp lệ. Đang chuyển hướng về
            giỏ hàng...
          </p>
          <button
            onClick={() => navigate("/cart")}
            className="payment-btn"
          >
            Về giỏ hàng
          </button>
        </>
      )}
    </div>
  );
};

export default PaymentFailure;
