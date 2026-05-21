import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "../../styles/Payment.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PaymentSuccess = () => {
  const { search, state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasProcessedRef = useRef(false);

  const params = new URLSearchParams(search);
  const responseCode = params.get("vnp_ResponseCode");

  const transactionNo =
    params.get("vnp_TransactionNo") ||
    params.get("vnp_TxnRef");

  const isCOD = !!state?.isCOD;

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const handleSuccess = async () => {
      try {
        // ===== COD =====
        if (isCOD) {
          setOrderDetails(state?.orderDetails || null);
          setLoading(false);
          return;
        }

        // ===== CHECK VNPAY RESPONSE =====
        if (!responseCode || responseCode !== "00") {
          setError(
            "Thông tin giao dịch không hợp lệ hoặc thanh toán không thành công."
          );

          setLoading(false);
          return;
        }

        // ===== GET PENDING ORDER =====
        const pendingRaw = localStorage.getItem("pendingOrder");

        if (!pendingRaw) {
          setError(
            "Thanh toán thành công nhưng không tìm thấy thông tin đơn hàng."
          );

          setLoading(false);
          return;
        }

        const pendingOrder = JSON.parse(pendingRaw);

        if (
          !pendingOrder ||
          !Array.isArray(pendingOrder.items) ||
          pendingOrder.items.length === 0
        ) {
          setError("Dữ liệu đơn hàng không hợp lệ.");

          setLoading(false);
          return;
        }

        // ===== GET TOKEN =====
        const token =
          user?.token ||
          localStorage.getItem("token") ||
          JSON.parse(
            localStorage.getItem("user") || "{}"
          )?.token;

        if (!token) {
          setError(
            "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
          );

          setLoading(false);
          return;
        }

        // ===== CREATE ORDER =====
        const orderPayload = {
          ...pendingOrder,
          paymentMethod: "VNPAY",
          paymentStatus: "PAID",
          transactionId: transactionNo,
        };

        try {
          const orderResponse = await axios.post(
            `${BASE_URL}/api/orders`,
            orderPayload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log(
            "✅ Đã tạo đơn hàng VNPay:",
            orderResponse.data
          );

          // ===== REMOVE CART ITEMS =====
          try {
            await axios.post(
              `${BASE_URL}/api/cart/remove-items`,
              {
                items: pendingOrder.items.map((item) => ({
                  productId: item.productId,
                  productPriceId:
                    item.productPriceId ?? null,
                  productImageId:
                    item.productImageId ?? null,
                })),
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          } catch (cartErr) {
            console.warn(
              "⚠️ Không thể xoá sản phẩm khỏi giỏ hàng:",
              cartErr.response?.data || cartErr.message
            );
          }
        } catch (orderErr) {
          console.error(
            "❌ Không thể tạo đơn hàng VNPay:",
            orderErr.response?.data || orderErr.message
          );

          setError(
            "Thanh toán thành công nhưng không thể tạo đơn hàng. Vui lòng kiểm tra Lịch sử đơn hàng hoặc liên hệ hỗ trợ."
          );
        }

        // ===== DISPLAY ORDER =====
        setOrderDetails({
          items: pendingOrder.items || [],
          total: pendingOrder.totalPrice || 0,
          totalPrice: pendingOrder.totalPrice || 0,
          address: pendingOrder.address || {},
          transactionNo,
          paymentMethod: "VNPAY",
        });

        // ===== CLEAR STORAGE =====
        localStorage.removeItem("pendingOrder");

        setLoading(false);
      } catch (err) {
        console.error("❌ Lỗi xử lý thanh toán:", err);

        setError(
          "Thanh toán thành công nhưng có lỗi khi xử lý đơn hàng."
        );

        setLoading(false);
      }
    };

    handleSuccess();
  }, [
    isCOD,
    state,
    responseCode,
    transactionNo,
    user,
  ]);

  if (loading) {
    return (
      <div className="payment-container payment-success-page">
        <h2 className="payment-title success">
          Đang xác nhận thanh toán...
        </h2>

        <p>Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  const items = orderDetails?.items || [];

  const total =
    orderDetails?.total ??
    orderDetails?.totalPrice ??
    0;

  const address = orderDetails?.address || {};

  return (
    <div className="payment-container payment-success-page">
      <h2 className="payment-title success">
        {isCOD
          ? "Đặt hàng thành công"
          : "Thanh toán thành công"}
      </h2>

      <p className="payment-success-lead">
        {isCOD
          ? "Đơn COD đã được ghi nhận. Shop sẽ liên hệ xác nhận trong thời gian sớm nhất."
          : `Giao dịch VNPay thành công${
              transactionNo
                ? ` • Mã: ${transactionNo}`
                : ""
            }`}
      </p>

      {error && (
        <p className="error-message">{error}</p>
      )}

      {orderDetails && (
        <>
          <div className="order-summary">
            <h3>Chi tiết đơn hàng</h3>

            <div className="order-items">
              {items.map((item, index) => {
                const productName =
                  item.productName ||
                  item.name ||
                  "Sản phẩm";

                const quantity =
                  item.quantity ||
                  item.qty ||
                  1;

                const unitPrice =
                  item.unitPrice ||
                  item.price ||
                  0;

                const optionLabel =
                  item.optionName ||
                  item.size;

                const colorLabel = item.color;

                return (
                  <div
                    key={`${
                      item.productId ||
                      item.id ||
                      "item"
                    }-${index}`}
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
                        <strong>
                          {productName}
                        </strong>
                      </p>

                      {optionLabel && (
                        <p>
                          Phân loại:{" "}
                          {optionLabel}
                        </p>
                      )}

                      {colorLabel && (
                        <p>
                          Màu sắc: {colorLabel}
                        </p>
                      )}

                      <p>
                        Số lượng: {quantity}
                      </p>

                      <p>
                        Đơn giá:{" "}
                        {unitPrice.toLocaleString(
                          "vi-VN"
                        )}
                        đ
                      </p>

                      <p>
                        Tổng:{" "}
                        {(
                          unitPrice * quantity
                        ).toLocaleString(
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
                  {total.toLocaleString(
                    "vi-VN"
                  )}
                  đ
                </strong>
              </p>
            </div>
          </div>

          <div className="shipping-address">
            <h3>Địa chỉ giao hàng</h3>

            {address?.fullName && (
              <p>
                <strong>
                  {address.fullName}
                </strong>{" "}
                {address.phone &&
                  `(${address.phone})`}
              </p>
            )}

            {address?.address ? (
              <p>{address.address}</p>
            ) : (
              <p>
                {address.detail},{" "}
                {address.ward},{" "}
                {address.district},{" "}
                {address.province}
              </p>
            )}

            <p style={{ marginTop: 8 }}>
              Cảm ơn bạn đã mua sắm tại
              EcotechStore!
            </p>
          </div>
        </>
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