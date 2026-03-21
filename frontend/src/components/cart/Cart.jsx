// src/components/cart/Cart.jsx
import React, { useMemo, useRef } from "react";
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
    cartLoading,
    total,
    setQuantity,
    removeFromCart,
    selectAll,
    toggleItemSelection,
  } = useCart();

  const navigate = useNavigate();
  const inputRefs = useRef({});

  const selectedItems = useMemo(
    () => cartItems.filter((item) => item.selected),
    [cartItems]
  );

  const allSelected = cartItems.length > 0 && selectedItems.length === cartItems.length;

  const handleViewProduct = (productId, categoryName) => {
    navigate(`/product/${encodeURIComponent(categoryName)}/${productId}`);
  };

  return (
    <>
      <div className="cart-items">
        <div className="cart-item-header">
          <span>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => selectAll(e.target.checked)}
              aria-label="Chọn tất cả sản phẩm"
            />
          </span>
          <span>STT</span>
          <span>Hình ảnh</span>
          <span>Tên sản phẩm</span>
          <span>Phân loại hàng</span>
          <span>Đơn giá</span>
          <span>Tồn kho</span>
          <span>Số lượng</span>
          <span>Số tiền</span>
          <span>Thao tác</span>
        </div>

        {cartItems.length === 0 ? (
          cartLoading ? (
            <div className="cart-skeleton-list" aria-live="polite" aria-busy="true">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="cart-skeleton-row">
                  <div className="cart-skeleton-block cart-skeleton-sm" />
                  <div className="cart-skeleton-block cart-skeleton-lg" />
                  <div className="cart-skeleton-block cart-skeleton-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-cart-state">
              <p className="empty-cart">Giỏ hàng của bạn đang trống.</p>
              <button
                type="button"
                className="empty-cart-cta"
                onClick={() => navigate("/")}
              >
                Tiếp tục mua sắm
              </button>
            </div>
          )
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
                <div className="cart-col cart-col-select">
                  <input
                    type="checkbox"
                    checked={item.selected !== false}
                    onChange={() =>
                      toggleItemSelection(item.productId, { color, optionName })
                    }
                    aria-label={`Chọn sản phẩm ${displayName}`}
                  />
                </div>

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

                <div className="cart-col cart-item-stock">
                  {Number(item.stock ?? 0).toLocaleString()}
                </div>

                <div className="cart-col cart-item-quantity">
                  <button
                    disabled={item.quantity <= 1}
                    onClick={() => {
                      const inputEl = inputRefs.current[key];
                      const typed = inputEl ? parseInt(inputEl.value, 10) : item.quantity;
                      const base = isNaN(typed) ? item.quantity : typed;
                      setQuantity(item.productId, { color, optionName }, Math.max(1, base - 1));
                    }}
                  >
                    -
                  </button>
                  <input
                    key={`${key}-${item.quantity}`}
                    ref={(el) => { inputRefs.current[key] = el; }}
                    type="number"
                    className="cart-qty-input"
                    min={1}
                    max={item.stock ?? 999}
                    defaultValue={item.quantity}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const clamped = Math.min(
                        Math.max(1, isNaN(val) ? 1 : val),
                        item.stock ?? 999
                      );
                      e.target.value = String(clamped);
                      setQuantity(item.productId, { color, optionName }, clamped);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  />
                  <button
                    disabled={item.quantity >= (item.stock ?? 999)}
                    onClick={() => {
                      const inputEl = inputRefs.current[key];
                      const typed = inputEl ? parseInt(inputEl.value, 10) : item.quantity;
                      const base = isNaN(typed) ? item.quantity : typed;
                      setQuantity(item.productId, { color, optionName }, Math.min(base + 1, item.stock ?? 999));
                    }}
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
