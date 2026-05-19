// src/context/CartContext.js
import React,
{
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import {
  fetchCart as apiFetchCart,
  addToCart as apiAddToCart,
  increaseQuantity as apiIncreaseQuantity,
  decreaseQuantity as apiDecreaseQuantity,
  removeFromCart as apiRemoveFromCart,
  setQuantity as apiSetQuantity,
  removeItems as apiRemoveItems,
} from "../services/cartApi";

import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// So sánh 1 biến thể trong giỏ (cho local guest + FE logic)
const isSameVariant = (item, productId, variant = {}) => {
  const { color = null, optionName = null } = variant || {};
  const itemColor = item.color ?? null;
  const itemOptionName = item.optionName ?? null;

  return (
    item.productId === productId &&
    itemColor === color &&
    itemOptionName === optionName
  );
};

const getSelectionKey = (item) => {
  if (item.cartItemId != null) return `cid-${item.cartItemId}`;
  return [
    item.productId,
    item.productPriceId ?? "no-price",
    item.productImageId ?? "no-image",
    item.optionName ?? "no-option",
    item.color ?? "no-color",
  ].join("|");
};

const applySelectionState = (nextItems = [], prevItems = []) => {
  const prevSelectionMap = new Map(
    prevItems.map((item) => [getSelectionKey(item), item.selected !== false])
  );

  return nextItems.map((item) => {
    const key = getSelectionKey(item);
    const selected = prevSelectionMap.has(key)
      ? prevSelectionMap.get(key)
      : item.selected !== undefined
      ? item.selected
      : true;
    return { ...item, selected };
  });
};

export const CartProvider = ({ children }) => {
  const { user, logout } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const total = useMemo(
    () =>
      cartItems
        .filter((item) => item.selected)
        .reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const loadCartFromLocalStorage = useCallback(() => {
    try {
      setCartLoading(true);
      const stored = localStorage.getItem("cartItems");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCartItems(
          parsed.map((i) => ({
            ...i,
            selected: i.selected !== undefined ? i.selected : true,
          }))
        );
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Lỗi load cart từ localStorage:", err);
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const fetchCartFromServer = useCallback(async () => {
    if (!user?.token) return;
    try {
      setCartLoading(true);
      const items = await apiFetchCart(user.token);
      setCartItems((prev) => applySelectionState(items || [], prev));
    } catch (error) {
      console.error("Lỗi lấy giỏ hàng từ server:", error);
      if (error.response?.status === 401) {
        logout();
        loadCartFromLocalStorage();
      }
    } finally {
      setCartLoading(false);
    }
  }, [user?.token, logout, loadCartFromLocalStorage]);

  useEffect(() => {
    if (user?.token) {
      fetchCartFromServer();
    } else {
      loadCartFromLocalStorage();
    }
  }, [user, fetchCartFromServer, loadCartFromLocalStorage]);

  useEffect(() => {
    if (!user?.token) {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    }
  }, [cartItems, user?.token]);

  // Thêm vào giỏ hàng
  const handleAddToCart = async (product) => {
    console.log("🛒 handleAddToCart:", product);

    if (user?.token) {
      try {
        const items = await apiAddToCart(product, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("Lỗi khi thêm vào cart (server):", error);
        alert(error.message || "Không thể thêm sản phẩm vào giỏ hàng");
      }
    } else {
      setCartItems((prev) => {
        const variant = {
          color: product.color ?? null,
          optionName: product.optionName ?? null,
        };

        const existing = prev.find((i) =>
          isSameVariant(i, product.productId, variant)
        );

        let updated;
        if (existing) {
          updated = prev.map((i) =>
            isSameVariant(i, product.productId, variant)
              ? { ...i, quantity: i.quantity + (product.quantity || 1) }
              : i
          );
        } else {
          updated = [
            ...prev,
            {
              productId: product.productId,
              name: product.name,
              price: product.price,
              image: product.image,

              color: product.color ?? null,
              optionName: product.optionName ?? null,
              brandName: product.brandName ?? null,
              categoryName: product.categoryName ?? null,

              productPriceId: product.productPriceId,
              productImageId: product.productImageId,

              quantity: product.quantity || 1,
              selected: true,
              attributes: product.attributes || undefined,
            },
          ];
        }

        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Tăng số lượng
  const handleIncreaseQuantity = async (productId, variant = {}) => {
    if (user?.token) {
      try {
        const item = cartItems.find((i) =>
          isSameVariant(i, productId, variant)
        );
        if (!item) {
          console.warn("Không tìm thấy item để tăng số lượng");
          return;
        }

        const items = await apiIncreaseQuantity(item.cartItemId, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("❌ Lỗi khi tăng số lượng:", error);
        alert(error.message || "Không thể tăng số lượng");
      }
    } else {
      setCartItems((prev) => {
        const updated = prev.map((i) =>
          isSameVariant(i, productId, variant)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Set số lượng trực tiếp
  const handleSetQuantity = async (productId, variant = {}, newQty) => {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    if (user?.token) {
      try {
        const item = cartItems.find((i) => isSameVariant(i, productId, variant));
        if (!item) return;
        const clamped = Math.min(qty, item.stock ?? 999);
        const items = await apiSetQuantity(item.cartItemId, clamped, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("❌ Lỗi khi set số lượng:", error);
      }
    } else {
      setCartItems((prev) => {
        const item = prev.find((i) => isSameVariant(i, productId, variant));
        const clamped = Math.min(qty, item?.stock ?? 999);
        const updated = prev.map((i) =>
          isSameVariant(i, productId, variant) ? { ...i, quantity: clamped } : i
        );
        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Giảm số lượng
  const handleDecreaseQuantity = async (productId, variant = {}) => {
    if (user?.token) {
      try {
        const item = cartItems.find((i) =>
          isSameVariant(i, productId, variant)
        );
        if (!item) {
          console.warn("Không tìm thấy item để giảm số lượng");
          return;
        }

        const items = await apiDecreaseQuantity(item.cartItemId, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("❌ Lỗi khi giảm số lượng:", error);
        alert(error.message || "Không thể giảm số lượng");
      }
    } else {
      setCartItems((prev) => {
        const updated = prev
          .map((i) =>
            isSameVariant(i, productId, variant) && i.quantity > 1
              ? { ...i, quantity: i.quantity - 1 }
              : i
          )
          .filter((i) => i.quantity > 0);

        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Xoá khỏi giỏ
  const handleRemoveFromCart = async (productId, variant = {}) => {
    if (user?.token) {
      try {
        const item = cartItems.find((i) =>
          isSameVariant(i, productId, variant)
        );
        if (!item) {
          console.warn("Không tìm thấy item để xoá");
          return;
        }

        const items = await apiRemoveFromCart(item.cartItemId, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("❌ Lỗi khi xóa khỏi giỏ hàng:", error);
        alert(error.message || "Không thể xóa sản phẩm khỏi giỏ hàng");
      }
    } else {
      setCartItems((prev) => {
        const updated = prev.filter(
          (i) => !isSameVariant(i, productId, variant)
        );
        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const selectAll = (checked) => {
    setCartItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: checked,
      }))
    );
  };

  const toggleItemSelection = (productId, variant = {}) => {
    setCartItems((prev) =>
      prev.map((item) =>
        isSameVariant(item, productId, variant)
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const removeSelectedItems = async () => {
    const selected = cartItems.filter((item) => item.selected);
    if (selected.length === 0) return;

    if (user?.token) {
      try {
        const payload = selected.map((item) => ({
          productId: item.productId,
          productPriceId: item.productPriceId ?? null,
          productImageId: item.productImageId ?? null,
        }));
        const items = await apiRemoveItems(payload, user.token);
        setCartItems((prev) => applySelectionState(items || [], prev));
      } catch (error) {
        console.error("❌ Lỗi khi xóa các sản phẩm đã chọn:", error);
        alert(error.message || "Không thể xóa các sản phẩm đã chọn");
      }
    } else {
      setCartItems((prev) => {
        const updated = prev.filter((item) => !item.selected);
        localStorage.setItem("cartItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const displayAttributes = (attributes = {}) =>
    Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

  const toggleCart = () => setIsOpen((prev) => !prev);

  const value = {
    cartItems,
    cartLoading,
    total,
    totalItems,
    isOpen,

    toggleCart,

    addToCart: handleAddToCart,
    increaseQuantity: handleIncreaseQuantity,
    decreaseQuantity: handleDecreaseQuantity,
    setQuantity: handleSetQuantity,
    removeFromCart: handleRemoveFromCart,
    removeSelectedItems,

    fetchCartFromServer,
    loadCartFromLocalStorage,

    selectAll,
    toggleItemSelection,

    displayAttributes,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
