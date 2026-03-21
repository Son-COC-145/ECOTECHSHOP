// src/components/product/ProductItem.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/ProductItem.css";

const ProductItem = ({ product, addToCart, selectedAddress, categoryName }) => {
  const [selectedPriceId, setSelectedPriceId] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  const priceOptions = useMemo(() => {
    return Array.isArray(product?.productPrices) ? product.productPrices : [];
  }, [product]);

  const colorOptions = useMemo(() => {
    if (!product?.productImages) return [];
    const colors = product.productImages.map((img) => img.color || "Không màu");
    return [...new Set(colors)];
  }, [product]);

  const imagesByColor = useMemo(() => {
    const map = {};
    if (Array.isArray(product?.productImages)) {
      product.productImages.forEach((img) => {
        const color = img.color || "Không màu";
        if (!map[color]) map[color] = [];
        map[color].push(img);
      });
    }
    return map;
  }, [product]);

  const selectedImageObj =
    (selectedColor && imagesByColor[selectedColor]?.[0]) ||
    product?.productImages?.[0] ||
    null;

  const selectedImageUrl =
    selectedImageObj?.imageUrl || product?.image || "/placeholder.png";

  const selectedImageId = selectedImageObj?.imageId;

  const selectedPriceOption = priceOptions.find(
    (p) => Number(p.priceId) === Number(selectedPriceId)
  );

  const currentPrice = selectedPriceOption
    ? Number(selectedPriceOption.optionPrice)
    : 0;

  const optionLabel = selectedPriceOption?.optionName || "";
  const stock = Number(product?.stock ?? 0);

  useEffect(() => {
    if (!selectedPriceId && priceOptions.length > 0) {
      setSelectedPriceId(priceOptions[0].priceId);
    }
    if (!selectedColor && colorOptions.length > 0) {
      setSelectedColor(colorOptions[0]);
    }
  }, [priceOptions, colorOptions, selectedPriceId, selectedColor]);

  const productId = product?.productId;

  const handleAddToCart = () => {
    if (!productId) return setError("Không xác định được sản phẩm.");
    if (currentPrice <= 0) return setError("Giá chưa được cập nhật.");

    const item = {
      productId,
      name: product.name,
      price: currentPrice,
      image: selectedImageUrl,
      categoryName: categoryName || "Không xác định",
      quantity,

      productPriceId: selectedPriceOption?.priceId,
      productImageId: selectedImageId,

      optionName: selectedPriceOption?.optionName,
      color: selectedColor,

      attributes: {
        optionName: optionLabel,
        option: optionLabel,
        color: selectedColor,
      },
    };

    addToCart(item);
    setError(null);
  };

  const handleBuyNow = () => {
    if (!user?.token) return navigate("/sign-in");

    const item = {
      productId,
      productPriceId: selectedPriceOption?.priceId,
      productImageId: selectedImageId,

      name: product.name,
      price: currentPrice,
      image: selectedImageUrl,
      quantity,
      selected: true,
      categoryName,

      optionName: selectedPriceOption?.optionName,
      color: selectedColor,

      attributes: {
        optionName: optionLabel,
        option: optionLabel,
        color: selectedColor,
      },
    };

    navigate("/payment", {
      state: {
        selectedItems: [item],
        total: currentPrice * quantity,
        selectedAddress,
      },
    });
  };

  return (
    <div className="product-item">
      <div className="product-top">
        <div className="product-left">
          <img
            src={selectedImageUrl}
            alt={product.name}
            className="product-image"
          />
        </div>

        <div className="product-right">
          <h2 className="product-name">{product.name}</h2>
          <p className="product-category">Phân loại: {categoryName}</p>
          <p className="product-stock">Còn lại: {stock.toLocaleString()} sản phẩm</p>

          {error && <p className="error-message">{error}</p>}

          <div className="option-block">
            <label>Chọn loại sản phẩm:</label>

            <div className="option-grid">
              {priceOptions.map((opt) => (
                <button
                  key={opt.priceId}
                  className={`option-btn ${
                    selectedPriceId === opt.priceId ? "active" : ""
                  }`}
                  onClick={() => setSelectedPriceId(opt.priceId)}
                >
                  {opt.optionName}
                </button>
              ))}
            </div>
          </div>

          <div className="option-block">
            <label>Chọn màu:</label>

            <div className="option-grid">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className={`option-btn ${
                    selectedColor === color ? "active" : ""
                  }`}
                  onClick={() => setSelectedColor(color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="option-block">
            <label>Số lượng:</label>

            <div className="quantity-wrapper">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                -
              </button>
              <input value={quantity} readOnly />
              <button onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="product-actions">
            <button
              onClick={handleAddToCart}
              className="btn-add"
              disabled={currentPrice <= 0}
            >
              Thêm vào giỏ
            </button>

            <button
              onClick={handleBuyNow}
              className="btn-buy"
              disabled={currentPrice <= 0}
            >
              Mua ngay
            </button>
          </div>
        </div>
      </div>

      <div className="product-bottom">
        <h3 className="price-text">
          {currentPrice > 0
            ? `${currentPrice.toLocaleString()} VND / ${optionLabel}`
            : "Giá chưa cập nhật"}
        </h3>

        <div className="product-description">
          <h3>Mô tả sản phẩm</h3>
          <p>{product.description || "Không có mô tả."}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
