// src/pages/CartPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Cart from "../components/cart/Cart";
import ShippingAddressForm from "../components/cart/ShippingAddressForm";
import EcoTechLogo from "../components/common/EcoTechLogo";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

import addressApi from "../services/addressApi";

import "../styles/CartPage.css";

const CartPage = () => {
  const { cartItems, total, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [error, setError] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const selectedItems = useMemo(
    () => cartItems.filter((item) => item.selected),
    [cartItems]
  );

  // ✅ Tự load địa chỉ mặc định khi vào trang (nếu user đã login)
  useEffect(() => {
    const fetchDefaultAddress = async () => {
      if (!user?.token) return;
      if (selectedAddress) return; // đã có rồi thì không fetch lại

      try {
        const addresses = await addressApi.getAddresses(user.token);
        if (addresses && addresses.length > 0) {
          const a = addresses[0];
          setSelectedAddress({
            addressId: a.addressId || a._id,
            fullName: a.fullName,
            phone: a.phone,
            province: a.province,
            district: a.district,
            ward: a.ward,
            detail: a.detail,
            address: `${a.detail}, ${a.ward}, ${a.district}, ${a.province}`, // Giữ để tương thích
          });
        }
      } catch (err) {
        console.error("Lỗi lấy địa chỉ mặc định:", err);
      }
    };

    fetchDefaultAddress();
  }, [user?.token, selectedAddress]);

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setIsAddressModalOpen(false);
    setIsAddingNew(false);
    setError(null);
  };

  const handleOpenAddressModal = (asNew) => {
    setIsAddingNew(asNew);
    setIsAddressModalOpen(true);
    setError(null);
  };

  const handleCheckout = () => {
    setError(null);

    if (!user) {
      setError("Vui lòng đăng nhập để tiếp tục thanh toán!");
      navigate("/signin");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
      return;
    }

    if (!selectedAddress) {
      setError("Vui lòng chọn hoặc thêm địa chỉ giao hàng để tiếp tục!");
      return;
    }

    navigate("/payment", {
      state: {
        selectedAddress,
        selectedItems,
        total,
      },
    });
  };

  const isCheckoutDisabled = total === 0 || !selectedAddress;

  return (
    <div className="main-content">
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          <div className="shop-logo">
            <EcoTechLogo size={40} showText={true} linkTo="/" />
            <p>Giỏ Hàng ({totalItems} sản phẩm)</p>
          </div>
        </div>

        {/* Box địa chỉ giao hàng */}
        <div className="address-section">
          <h3>Địa chỉ giao hàng</h3>
          {error && <p className="error-message">{error}</p>}

          {selectedAddress ? (
            <div className="selected-address">
              <p>
                <strong>{selectedAddress.fullName}</strong> (
                {selectedAddress.phone})
              </p>
              <p>{selectedAddress.address}</p>

              <div className="address-actions-inline">
                <button
                  type="button"
                  className="change-address-btn"
                  onClick={() => handleOpenAddressModal(false)}
                >
                  Thay đổi địa chỉ
                </button>
                <button
                  type="button"
                  className="add-address-btn"
                  onClick={() => handleOpenAddressModal(true)}
                >
                  Thêm địa chỉ mới
                </button>
              </div>
            </div>
          ) : (
            <div className="selected-address">
              <p className="address-empty-text">
                Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ để nhận hàng nhanh
                và chính xác hơn.
              </p>
              <button
                type="button"
                className="add-address-btn"
                onClick={() => handleOpenAddressModal(true)}
              >
                Thêm địa chỉ mới
              </button>
            </div>
          )}
        </div>

        {/* Giỏ hàng */}
        <Cart
          onCheckout={handleCheckout}
          isCheckoutDisabled={isCheckoutDisabled}
        />
      </div>

      {/* Modal quản lý địa chỉ */}
      {isAddressModalOpen && (
        <ShippingAddressForm
          onAddressSelect={handleAddressSelect}
          onClose={() => setIsAddressModalOpen(false)}
          initialData={isAddingNew ? null : selectedAddress}
          isAddingNew={isAddingNew}
        />
      )}
    </div>
  );
};

export default CartPage;