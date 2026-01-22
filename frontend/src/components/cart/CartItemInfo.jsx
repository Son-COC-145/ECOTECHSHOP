// src/components/cart/CartItemInfo.jsx
import React from "react";
import { useProductInfo } from "../../hooks/useProductInfo";

/**
 * Hiển thị tên sản phẩm trong giỏ:
 * - Nếu đã truyền sẵn `name` → dùng luôn.
 * - Nếu không có `name` → gọi useProductInfo(productId) để lấy tên mới nhất.
 */
const CartItemInfo = ({
  productId,
  fallbackName = "Đang tải...",
  name,
}) => {
  const { product, loading, error } = useProductInfo(productId);

  // Ưu tiên dùng name truyền từ ngoài (Menu/ProductItem)
  if (name) {
    return <span>{name}</span>;
  }

  if (loading) {
    return <span>{fallbackName}</span>;
  }

  if (error || !product) {
    return <span>{fallbackName}</span>;
  }

  return <span>{product.name || fallbackName}</span>;
};

export default CartItemInfo;
