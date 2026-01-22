// src/components/cart/Cart.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import CartItemInfo from "./CartItemInfo";
import "../../styles/Cart.css";

const extractMeta = (item) => {
  const color =
    item.color ??
    item.productColor ??
    item.attributes?.color ??
    item.attributes?.Color ??
    null;

  const optionName =
    item.optionName ??
    item.productPriceOptionName ??
    item.variantName ??
    item.attributes?.optionName ??
    item.attributes?.option ??
    null;

  const categoryName =
    item.categoryName ?? item.category ?? item.category_title ?? "Đang cập nhật";

  const brandName =
    item.brandName ?? item.brand ?? item.brand_title ?? null;

  return { color, optionName, categoryName, brandName };
};

const buildClassificationText = (item) => {
  const { optionName, color, categoryName, brandName } = extractMeta(item);

  const main = [];
  if (optionName) main.push(optionName);
  if (color) main.push(`Màu: ${color}`);

  if (main.length > 0) return main.join(" • ");

  const fallback = [categoryName, brandName].filter(Boolean);
  return fallback.length ? fallback.join(" • ") : "Đang cập nhật";
};

const Cart = ({ onCheckout, isCheckoutDisabled }) => {
  const {
    cartItems,
    total,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const navigate = useNavigate();

  const selectedItems = useMemo(
    () => cartItems.filter((item) => item.selected),
    [cartItems]
  );

  const handleViewProduct = (productId, categoryName) => {
    navigate(`/product/${encodeURIComponent(categoryName)}/${productId}`);
  };

  return (
    <>
      <div className="cart-items">
        <div className="cart-item-header">
          <span>STT</span>
          <span>Hình ảnh</span>
          <span>Tên sản phẩm</span>
          <span>Phân loại hàng</span>
          <span>Đơn giá</span>
          <span>Số lượng</span>
          <span>Số tiền</span>
          <span>Thao tác</span>
        </div>

        {cartItems.length === 0 ? (
          <p className="empty-cart">Giỏ hàng của bạn đang trống.</p>
        ) : (
          cartItems.map((item, index) => {
            const { color, optionName, categoryName } = extractMeta(item);
            const classificationText = buildClassificationText(item);
            const displayName = item.productName || item.name || "Sản phẩm";

            const key =
              item.cartItemId ??
              `${item.productId}-${color || "no-color"}-${
                optionName || "no-option"
              }`;

            return (
              <div key={key} className="cart-item">
                <div className="cart-col cart-col-index">{index + 1}</div>

                <div className="cart-col cart-item-image-wrapper">
                  <img
                    src={item.image}
                    alt={displayName}
                    className="cart-item-image"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                      e.target.onerror = null;
                    }}
                  />
                </div>

                <div
                  className="cart-col cart-item-name"
                  onClick={() =>
                    handleViewProduct(item.productId, categoryName)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartItemInfo
                    productId={item.productId}
                    fallbackName={displayName}
                    name={displayName}
                  />
                  {color && (
                    <p className="cart-item-variant">Màu: {color}</p>
                  )}
                </div>

                <div className="cart-col cart-item-classification">
                  {classificationText}
                </div>

                <div className="cart-col cart-item-price">
                  {Number(item.price || 0).toLocaleString()}đ
                </div>

                <div className="cart-col cart-item-quantity">
                  <button
                    onClick={() =>
                      decreaseQuantity(item.productId, { color, optionName })
                    }
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      increaseQuantity(item.productId, { color, optionName })
                    }
                  >
                    +
                  </button>
                </div>

                <div className="cart-col cart-item-total">
                  {Number(item.price * item.quantity || 0).toLocaleString()}đ
                </div>

                <div className="cart-col cart-item-actions">
                  <button
                    onClick={() =>
                      removeFromCart(item.productId, { color, optionName })
                    }
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="cart-summary">
        <div className="summary-details">
          <p>
            Tổng thanh toán ({selectedItems.length} sản phẩm):
            <span> {Number(total || 0).toLocaleString()}đ</span>
          </p>
        </div>

        <button
          className="checkout-btn"
          onClick={onCheckout}
          disabled={isCheckoutDisabled || selectedItems.length === 0}
        >
          Đặt Hàng
        </button>
      </div>
    </>
  );
};

export default Cart;
