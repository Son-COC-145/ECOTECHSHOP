import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "../../styles/Payment.css";

const PaymentSuccess = () => {
  const { search, state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(search);
  const responseCode =
    params.get("responseCode") || params.get("vnp_ResponseCode");
  const transactionNo =
    params.get("transactionNo") ||
    params.get("vnp_TransactionNo") ||
    params.get("txnRef") ||
    params.get("vnp_TxnRef");
  const isCOD = !!state?.isCOD;

  useEffect(() => {
    if (isCOD) {
      setOrderDetails(state?.orderDetails || null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!responseCode || !transactionNo) {
      setError("Thông tin giao dịch không hợp lệ.");
      setLoading(false);
      setTimeout(() => navigate("/cart"), 3000);
      return;
    }

    if (responseCode !== "00") {
      setError("Mã phản hồi không thành công (responseCode ≠ 00).");
    }

    const loadOrder = async () => {
      try {
        // 1. Ưu tiên lấy từ localStorage (pendingOrder mà Payment.jsx đã lưu)
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
              setLoading(false);
              localStorage.removeItem("pendingOrder");
              return;
            }
          } catch (e) {
            console.warn("Không parse được pendingOrder:", e);
          }
        }

        // 2. Nếu không có pendingOrder, thử lấy từ API (đơn đã được tạo trong DB)
        if (user?.token) {
          const baseUrl =
            process.env.REACT_APP_API_URL || "http://localhost:5000";
          const res = await axios.get(
            `${baseUrl}/api/orders/by-transaction/${transactionNo}`,
            {
              headers: { Authorization: `Bearer ${user.token}` },
            }
          );

          if (res.data) {
            setOrderDetails(res.data);
            setLoading(false);
            localStorage.removeItem("pendingOrder");
            return;
          }
        }

        // 3. Không có gì cả
        setError(
          "Không tìm thấy thông tin chi tiết đơn hàng. Giao dịch của bạn đã được ghi nhận, vui lòng kiểm tra Lịch sử đơn hàng hoặc liên hệ hỗ trợ."
        );
        setLoading(false);
      } catch (err) {
        console.error(
          "Lỗi khi lấy đơn hàng từ API:",
          err.response?.data || err.message
        );
        setError(
          "Không thể lấy thông tin đơn hàng. Giao dịch của bạn đã được ghi nhận. Vui lòng kiểm tra Lịch sử đơn hàng hoặc liên hệ hỗ trợ."
        );
        setLoading(false);
      } finally {
        // Dù thành công hay lỗi thì cũng clear pendingOrder
        localStorage.removeItem("pendingOrder");
      }
    };

    loadOrder();
  }, [isCOD, state, responseCode, transactionNo, navigate, user]);

  if (loading) {
    return (
      <div className="payment-container payment-success-page">
        <h2 className="payment-title success">Đang xác nhận thanh toán...</h2>
        <p>Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  const items = orderDetails?.items || [];
  const total =
    orderDetails?.total ?? orderDetails?.totalPrice ?? 0;
  const address = orderDetails?.address || {};

  return (
    <div className="payment-container payment-success-page">
      <h2 className="payment-title success">
        {isCOD ? "Đặt hàng thành công" : "Thanh toán thành công"}
      </h2>

      <p className="payment-success-lead">
        {isCOD
          ? "Đơn COD đã được ghi nhận. Shop sẽ liên hệ xác nhận trong thời gian sớm nhất."
          : `Giao dịch VNPay thành công${transactionNo ? ` • Mã: ${transactionNo}` : ""}`}
      </p>

      {error && <p className="error-message">{error}</p>}

      {orderDetails ? (
        <>
          <div className="order-summary">
            <h3>Chi tiết đơn hàng</h3>
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
                Tổng thanh toán (
                {items.length} sản phẩm):{" "}
                <strong>
                  {total.toLocaleString("vi-VN")}đ
                </strong>
              </p>
            </div>
          </div>

          <div className="shipping-address">
            <h3>Địa chỉ giao hàng</h3>
            {address?.fullName && (
              <p>
                <strong>{address.fullName}</strong>{" "}
                {address.phone && `(${address.phone})`}
              </p>
            )}
            {address?.address && <p>{address.address}</p>}
            {!address?.address &&
              (address.detail || address.ward || address.district || address.province) && (
                <p>
                  {address.detail},{" "}
                  {address.ward}, {address.district},{" "}
                  {address.province}
                </p>
              )}
            <p style={{ marginTop: 8 }}>
              Cảm ơn bạn đã mua sắm tại EcotechStore!
            </p>
          </div>
        </>
      ) : (
        <p>
          {isCOD ? (
            <>
              Đơn hàng COD đã được ghi nhận. Vui lòng kiểm tra
              Lịch sử đơn hàng để xem chi tiết.
            </>
          ) : (
            <>
              Giao dịch thành công với mã giao dịch: {" "}
              <strong>{transactionNo}</strong>. Vui lòng kiểm tra
              Lịch sử đơn hàng để xem chi tiết.
            </>
          )}
        </p>
      )}

      <div className="payment-actions payment-actions-centered">
        <button
          onClick={() => navigate("/")}
          className="payment-btn"
        >
          Quay lại trang chủ
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
