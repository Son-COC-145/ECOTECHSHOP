// src/components/cart/CartSidebar.jsx
import React, { useEffect } from "react";
import "../../styles/cartsidebar.css";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import CartItemInfo from "./CartItemInfo";
import EcoTechLogo from "../common/EcoTechLogo";

/**
 * Helper: gom meta cho 1 item
 */
const extractMeta = (item) => {
  const color =
    item.color ??
    item.attributes?.color ??
    item.attributes?.Color ??
    null;

  const optionName =
    item.optionName ??
    item.attributes?.optionName ??
    item.attributes?.option ??
    null;

  const categoryName =
    item.categoryName ??
    item.category ??
    item.category_title ??
    "Đang cập nhật";

  const brandName =
    item.brandName ??
    item.brand ??
    item.brand_title ??
    null;

  return { color, optionName, categoryName, brandName };
};

function CartSidebar() {
  const {
    cartItems,
    removeFromCart,
    isOpen,
    toggleCart,
    increaseQuantity,
    decreaseQuantity,
    setQuantity,
    fetchCartFromServer,
    loadCartFromLocalStorage,
  } = useCart();

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Refs to read typed-but-not-committed input values when +/- is clicked
  const inputRefs = React.useRef({});

  useEffect(() => {
    const initializeCart = async () => {
      if (user?.token) {
        try {
          await fetchCartFromServer();
        } catch (error) {
          if (error.response?.status === 401) {
            logout();
            navigate("/sign-in");
          } else {
            loadCartFromLocalStorage();
          }
        }
      } else {
        loadCartFromLocalStorage();
      }
    };

    initializeCart();
  }, [user, fetchCartFromServer, loadCartFromLocalStorage, logout, navigate]);

  const handleViewCart = () => navigate("/cart");

  const handleViewProduct = (productId, categoryName) => {
    const path = categoryName
      ? `/product/${encodeURIComponent(categoryName)}/${productId}`
      : `/product/unknown/${productId}`;
    navigate(path);
  };

  const numberOfItems = cartItems.length;

  return (
    <>
      {/* Nút floating mở sidebar */}
      <div className="cart-toggle-btn" onClick={toggleCart}>
        <i className="fas fa-shopping-cart" />
        <span className="cart-count-badge">{numberOfItems}</span>
      </div>

      <div id="cart-sidebar" className={isOpen ? "open" : "closed"}>
        <div className="cart-header">
          <EcoTechLogo size={32} showText={true} linkTo={null} />
          <button className="close-btn" onClick={toggleCart}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="cart-actions">
          <p id="cart-count">Số lượng mặt hàng: {numberOfItems}</p>
        </div>

        <ul id="cart-items">
          {cartItems.map((item) => {
            const { color, optionName, categoryName } = extractMeta(item);

            const variantTextParts = [];
            if (optionName) variantTextParts.push(optionName);
            if (color) variantTextParts.push(`Màu: ${color}`);
            const variantText =
              variantTextParts.length > 0
                ? variantTextParts.join(" • ")
                : null;

            const variantKey = `${color || "no-color"}-${
              optionName || "no-option"
            }`;

            const rowKey =
              item.cartItemId ??
              `${item.productId}-${variantKey}`;

            return (
              <li key={rowKey} className="cart-item">
                <div
                  className="cart-item-details"
                  onClick={() =>
                    handleViewProduct(item.productId, categoryName)
                  }
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-image"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                      e.target.onerror = null;
                    }}
                  />

                  <div className="cart-item-info">
                    <span className="cart-item-name">
                      <CartItemInfo
                        productId={item.productId}
                        fallbackName={item.name || "Tên sản phẩm"}
                        name={item.name}
                      />
                    </span>

                    {variantText && (
                      <span className="cart-item-variant">
                        {variantText}
                      </span>
                    )}

                    <span className="cart-item-price">
                      {item.price != null && Number(item.price) > 0
                        ? `${Number(item.price).toLocaleString()} VND`
                        : "Chưa có giá"}
                    </span>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          const inputEl = inputRefs.current[rowKey];
                          const typed = inputEl ? parseInt(inputEl.value, 10) : item.quantity;
                          const base = isNaN(typed) ? item.quantity : typed;
                          const newQty = Math.max(1, base - 1);
                          setQuantity(
                            item.productId,
                            { color: color ?? null, optionName: optionName ?? null },
                            newQty
                          );
                        }}
                      >
                        -
                      </button>

                      <input
                        key={`${rowKey}-${item.quantity}`}
                        ref={(el) => { inputRefs.current[rowKey] = el; }}
                        type="number"
                        className="qty-input"
                        min={1}
                        max={item.stock ?? 999}
                        defaultValue={item.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          e.stopPropagation();
                          const val = parseInt(e.target.value, 10);
                          const clamped = Math.min(
                            Math.max(1, isNaN(val) ? 1 : val),
                            item.stock ?? 999
                          );
                          e.target.value = String(clamped);
                          setQuantity(
                            item.productId,
                            { color: color ?? null, optionName: optionName ?? null },
                            clamped
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                      />

                      <button
                        type="button"
                        disabled={item.quantity >= (item.stock ?? 999)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const inputEl = inputRefs.current[rowKey];
                          const typed = inputEl ? parseInt(inputEl.value, 10) : item.quantity;
                          const base = isNaN(typed) ? item.quantity : typed;
                          const newQty = Math.min(base + 1, item.stock ?? 999);
                          setQuantity(
                            item.productId,
                            { color: color ?? null, optionName: optionName ?? null },
                            newQty
                          );
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="cart-item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(item.productId, {
                      color: color ?? null,
                      optionName: optionName ?? null,
                    });
                  }}
                >
                  Xóa
                </button>
              </li>
            );
          })}
        </ul>

        <div className="cart-footer">
          <button id="view-cart-btn" onClick={handleViewCart}>
            Xem giỏ hàng
          </button>
        </div>
      </div>
    </>
  );
}

export default CartSidebar;