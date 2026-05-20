// src/pages/Payment.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import AddressService from "../../services/addressApi";
import ShippingAddressForm from "./ShippingAddressForm";
import "../../styles/Payment.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const VNPAY_CREATE_PAYMENT_URL = `${BASE_URL}/api/vnpay/create-payment`;

const Payment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("vnpay");

  const items = state?.selectedItems || (state?.item ? [state.item] : []);
  const total = state?.total || 0;

  const getProductName = (item) =>
    item.productName || item.name || item.title || "Sản phẩm";

  const getVariantLabel = (item) => item.optionName || item.variant || null;

  const getColorLabel = (item) =>
    item.color || item.attributes?.color || null;

  const getUnitPrice = (item) => item.unitPrice || item.price || 0;

  // ====== FETCH ĐỊA CHỈ & CHECK LOGIN ======
  useEffect(() => {
    // Nếu chưa login thì đá về trang đăng nhập
    if (!user || !user.token) {
      navigate("/sign-in");
      return;
    }

    const fetchAddresses = async () => {
      try {
        setIsFetchingAddresses(true);
        const addresses = await AddressService.getAddresses(user.token);

        // Ưu tiên: Nếu có địa chỉ từ state (từ CartPage) và có đầy đủ thông tin
        if (state?.selectedAddress && 
            state.selectedAddress.province && 
            state.selectedAddress.district && 
            state.selectedAddress.ward && 
            state.selectedAddress.detail) {
          setSelectedAddress(state.selectedAddress);
          return;
        }

        // Nếu có địa chỉ từ state nhưng thiếu thông tin, tìm từ API để bổ sung
        if (state?.selectedAddress) {
          const addressFromApi = addresses.find(
            (addr) => (addr.addressId && addr.addressId === state.selectedAddress.addressId) ||
                     (addr.addressId && state.selectedAddress._id && addr.addressId === state.selectedAddress._id) ||
                     (addr._id && addr._id === state.selectedAddress.addressId) ||
                     (addr._id && state.selectedAddress._id && addr._id === state.selectedAddress._id)
          );
          
          if (addressFromApi) {
            setSelectedAddress({
              addressId: addressFromApi.addressId || addressFromApi._id,
              fullName: addressFromApi.fullName || state.selectedAddress.fullName,
              phone: addressFromApi.phone || state.selectedAddress.phone,
              province: addressFromApi.province || state.selectedAddress.province || null,
              district: addressFromApi.district || state.selectedAddress.district || null,
              ward: addressFromApi.ward || state.selectedAddress.ward || null,
              detail: addressFromApi.detail || state.selectedAddress.detail || null,
            });
            return;
          }
        }

        // Nếu không có từ state, lấy địa chỉ đầu tiên từ API
        if (addresses && addresses.length > 0) {
          const firstAddress = addresses[0];
          setSelectedAddress({
            addressId: firstAddress.addressId || firstAddress._id,
            fullName: firstAddress.fullName,
            phone: firstAddress.phone,
            province: firstAddress.province || null,
            district: firstAddress.district || null,
            ward: firstAddress.ward || null,
            detail: firstAddress.detail || null,
          });
        }
      } catch (err) {
        console.error("Lỗi khi lấy danh sách địa chỉ:", err);
        setError(
          "Không thể tải danh sách địa chỉ. Vui lòng thêm địa chỉ mới trong giỏ hàng."
        );
      } finally {
        setIsFetchingAddresses(false);
      }
    };

    fetchAddresses();
  }, [user, navigate, state]); // Giữ state để khi navigate từ cart sẽ load lại

  // ====== TẠO MÔ TẢ ĐƠN HÀNG GỬI VNPAY ======
  const createOrderInfo = (items) =>
    items
      .map((item) => {
        const name = getProductName(item);
        const quantity = item.quantity || 1;
        const price = getUnitPrice(item);
        const variant = getVariantLabel(item);
        const color = getColorLabel(item);

        const parts = [`${name} x${quantity}`, `${price.toLocaleString("vi-VN")}đ`];
        if (variant) parts.push(`Loai ${variant}`);
        if (color) parts.push(`Mau ${color}`);
        return parts.join("  ");
      })
      .join(" ");

  const validateCheckoutData = () => {
    if (!user || !user.token) {
      setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      navigate("/sign-in");
      return false;
    }

    if (!items.length || !total) {
      setError("Dữ liệu thanh toán không hợp lệ.");
      return false;
    }

    if (
      !selectedAddress?.fullName ||
      !selectedAddress?.phone ||
      !selectedAddress?.province ||
      !selectedAddress?.district ||
      !selectedAddress?.ward ||
      !selectedAddress?.detail
    ) {
      setError(
        "Vui lòng chọn hoặc thêm địa chỉ giao hàng đầy đủ trước khi thanh toán."
      );
      return false;
    }

    return true;
  };

  const buildPendingOrder = () => {
    const addressString = `${selectedAddress.detail}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.province}`;
    const normalizedAddressId = Number(
      selectedAddress?.addressId || selectedAddress?._id || 0
    );

    const userId = user?._id || user?.id || user?.userId || null;

    const products = items.map((item) => {
      const price = getUnitPrice(item);
      const quantity = item.quantity || 1;

      return {
        productId: item.productId,
        productPriceId: item.productPriceId || null,
        productImageId: item.productImageId || null,
        quantity,
        unitPrice: price,
        productName: getProductName(item),
        optionName: getVariantLabel(item),
        color: getColorLabel(item),
        image: item.image,
      };
    });

    return {
      userId,
      items: products,
      totalPrice: total,
      addressId: normalizedAddressId > 0 ? normalizedAddressId : undefined,
      address: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        province: selectedAddress.province,
        district: selectedAddress.district,
        ward: selectedAddress.ward,
        detail: selectedAddress.detail,
        address: addressString,
      },
    };
  };

  // ====== XỬ LÝ THANH TOÁN ======
  const handlePayment = async () => {
    if (!validateCheckoutData()) return;

    const pendingOrder = buildPendingOrder();

    if (
      !pendingOrder.items.length ||
      !pendingOrder.totalPrice ||
      !pendingOrder.address.fullName ||
      !pendingOrder.address.phone ||
      !pendingOrder.address.address
    ) {
      setError("Dữ liệu đơn hàng không đầy đủ. Vui lòng kiểm tra lại.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      localStorage.setItem("pendingOrder", JSON.stringify(pendingOrder));

      console.log("Dữ liệu gửi đến VNPay server:", {
        amount: total,
        orderInfo: createOrderInfo(items),
        userId: pendingOrder.userId,
        items: pendingOrder.items,
        totalPrice: pendingOrder.totalPrice,
        addressId: pendingOrder.addressId,
        address: pendingOrder.address,
      });

      const orderId = `ECO${Date.now()}`;

      const response = await axios.post(
        VNPAY_CREATE_PAYMENT_URL,
        {
          amount: total,
          orderId,
          orderInfo: createOrderInfo(items),
          userId: pendingOrder.userId,
          items: pendingOrder.items,
          totalPrice: pendingOrder.totalPrice,
          addressId: pendingOrder.addressId,
          address: pendingOrder.address,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else {
        setError("Không thể tạo URL thanh toán. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error(
        "Lỗi khi tạo URL thanh toán:",
        err.response?.data || err.message
      );
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        setError(
          "Phiên đăng nhập hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại."
        );
        setTimeout(() => navigate("/sign-in"), 1500);
      } else {
        setError(
          err.response?.data?.error ||
            err.message ||
            "Đã có lỗi xảy ra. Vui lòng thử lại!"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCODPayment = async () => {
    if (!validateCheckoutData()) return;

    const pendingOrder = buildPendingOrder();

    if (
      !pendingOrder.items.length ||
      !pendingOrder.totalPrice ||
      !pendingOrder.address.fullName ||
      !pendingOrder.address.phone ||
      !pendingOrder.address.address
    ) {
      setError("Dữ liệu đơn hàng không đầy đủ. Vui lòng kiểm tra lại.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderResponse = await axios.post(
        `${BASE_URL}/api/orders`,
        {
          ...pendingOrder,
          paymentMethod: "COD",
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (!orderResponse.data?.success) {
        throw new Error(orderResponse.data?.message || "Không thể tạo đơn hàng COD");
      }

      await axios.post(
        `${BASE_URL}/api/cart/remove-items`,
        {
          items: pendingOrder.items.map((item) => ({
            productId: item.productId,
            productPriceId: item.productPriceId ?? null,
            productImageId: item.productImageId ?? null,
          })),
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      navigate("/payment/success", {
        state: {
          isCOD: true,
          orderId: orderResponse.data.orderId,
          orderDetails: {
            items: pendingOrder.items,
            total: pendingOrder.totalPrice,
            totalPrice: pendingOrder.totalPrice,
            address: pendingOrder.address,
            paymentMethod: "COD",
          },
        },
      });
    } catch (err) {
      console.error("Lỗi khi đặt hàng COD:", err.response?.data || err.message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        setError(
          "Phiên đăng nhập hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại."
        );
        setTimeout(() => navigate("/sign-in"), 1500);
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Đã có lỗi xảy ra. Vui lòng thử lại!"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!items.length || !total) {
    return (
      <div className="payment-container">
        <h2 className="payment-title">Thanh toán</h2>
        <p className="error-message">
          {error ||
            "Không tìm thấy dữ liệu đơn hàng. Vui lòng quay lại giỏ hàng."}
        </p>
      </div>
    );
  }

  return (
    <div className="payment-container with-background">
      <h2 className="payment-title">Thanh toán</h2>

      <div className="order-summary">
        <h3>Thông tin đơn hàng</h3>
        <div className="order-items">
          {items.map((item, index) => {
            const name = getProductName(item);
            const quantity = item.quantity || 1;
            const price = getUnitPrice(item);
            const variant = getVariantLabel(item);
            const color = getColorLabel(item);
            const lineTotal = price * quantity;

            // key tránh trùng: productId + productPriceId + index
            const key = `${item.productId || "p"}-${
              item.productPriceId || item.optionName || "opt"
            }-${index}`;

            return (
              <div key={key} className="order-item">
                {item.image && (
                  <img
                    src={item.image}
                    alt={name}
                    className="order-item-image"
                  />
                )}
                <div className="order-item-details">
                  <p>
                    <strong>{name}</strong>
                  </p>
                  <p>Số lượng: {quantity}</p>
                  <p>Đơn giá: {price.toLocaleString("vi-VN")}đ</p>
                  {variant && <p>Phân loại: {variant}</p>}
                  {color && <p>Màu sắc: {color}</p>}
                  <p>
                    Tổng: {lineTotal.toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="order-total">
          <p>
            Tổng thanh toán ({items.length} sản phẩm):{" "}
            <strong>{total.toLocaleString("vi-VN")}đ</strong>
          </p>
        </div>
      </div>

      <div className="shipping-address">
        <h3>Địa chỉ giao hàng</h3>
        {isFetchingAddresses ? (
          <div className="payment-skeleton-list" aria-live="polite" aria-busy="true">
            <div className="payment-skeleton-line payment-skeleton-sm" />
            <div className="payment-skeleton-line payment-skeleton-lg" />
            <div className="payment-skeleton-line payment-skeleton-md" />
          </div>
        ) : selectedAddress ? (
          <div>
            <p>
              <strong>{selectedAddress.fullName || ""}</strong>{" "}
              {selectedAddress.phone && `(${selectedAddress.phone})`}
            </p>
            <p>
              {selectedAddress.detail && selectedAddress.ward && selectedAddress.district && selectedAddress.province
                ? `${selectedAddress.detail}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.province}`
                : selectedAddress.address || "Chưa có địa chỉ chi tiết"}
            </p>
            <div className="address-actions">
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(true);
                  setIsAddingNew(false);
                }}
                className="address-btn address-btn-secondary"
              >
                Thay đổi địa chỉ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(true);
                  setIsAddingNew(true);
                }}
                className="address-btn address-btn-primary"
              >
                Thêm địa chỉ mới
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>
              Chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ trước khi thanh toán.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsAddressModalOpen(true);
                setIsAddingNew(true);
              }}
              className="address-btn address-btn-primary"
            >
              Thêm địa chỉ mới
            </button>
          </div>
        )}
      </div>

      {/* Modal quản lý địa chỉ */}
      {isAddressModalOpen && (
        <ShippingAddressForm
          onAddressSelect={(address) => {
            setSelectedAddress(address);
            setIsAddressModalOpen(false);
            setIsAddingNew(false);
            setError(null);
          }}
          onClose={() => setIsAddressModalOpen(false)}
          initialData={isAddingNew ? null : selectedAddress}
          isAddingNew={isAddingNew}
        />
      )}

      <div className="shipping-address payment-method-box">
        <h3>Phương thức thanh toán</h3>
        <div className="payment-method-list">
          <label className="payment-method-option">
            <input
              type="radio"
              name="paymentMethod"
              value="vnpay"
              checked={paymentMethod === "vnpay"}
              onChange={() => setPaymentMethod("vnpay")}
            />
            Thanh toán VNPay
          </label>
          <label className="payment-method-option">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
            />
            Thanh toán khi giao hàng (COD)
          </label>
        </div>
      </div>

      <div className="payment-actions">
        {error && <p className="error-message">{error}</p>}
        <button
          onClick={paymentMethod === "cod" ? handleCODPayment : handlePayment}
          disabled={
            loading ||
            !selectedAddress?.fullName ||
            !user?.token ||
            isFetchingAddresses
          }
          className="payment-btn"
        >
          {loading
            ? "Đang xử lý..."
            : paymentMethod === "cod"
            ? "Đặt hàng (COD)"
            : "Thanh toán với VNPay"}
        </button>
      </div>
    </div>
  );
};

export default Payment;