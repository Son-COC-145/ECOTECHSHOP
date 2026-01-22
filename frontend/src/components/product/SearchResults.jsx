import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../layout/Header";
import { useCart } from "../../context/CartContext";
import "../../styles/SearchResults.css";
import "../../styles/Menu.css"; // ✅ Import Menu.css để dùng cùng styles
import { apiConfig } from "../../config/api";

function SearchResults() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const BASE_URL =
    apiConfig?.baseURL ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  // 🚀 LOAD KẾT QUẢ TÌM KIẾM
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    axios
      .get(`${BASE_URL}/api/search/semantic?q=${encodeURIComponent(keyword)}`)
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data : [];

        const normalized = raw.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          similarity: item.similarity ?? null,
          productPrices: item.productPrices || [],
          rating: item.rating || 5,
          sold: item.sold || 0,
          categoryName: item.categoryName || "",
          brandName: item.brandName || "",
        }));

        setResults(normalized);
      })
      .catch((err) => {
        console.error("❌ Lỗi tìm kiếm:", err);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [keyword, BASE_URL]);

  // ✅ Handle add to cart (giống Menu)
  const handleAddToCart = async (item) => {
    const firstPrice = item.productPrices?.[0];

    if (!firstPrice) {
      setError("Sản phẩm chưa có giá");
      return;
    }

    const price = Number(firstPrice.optionPrice);
    const optionName = firstPrice.optionName;

    const cartItem = {
      productId: item.productId,
      name: item.name,
      price,
      image: item.image,
      quantity: 1,
      categoryName: item.categoryName,
      brandName: item.brandName,
      productPriceId: firstPrice.priceId,
      optionName,
      attributes: {
        optionName,
      },
    };

    try {
      await addToCart(cartItem);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 2500);
    } catch (err) {
      console.error(err);
      setError("Không thể thêm vào giỏ hàng");
    }
  };

  return (
    <>
      <Header />

      <div className="search-results-container">
        <h2 className="search-title">Kết quả tìm kiếm cho: "{keyword}"</h2>

        {!loading && (
          <p className="search-subtitle">Tìm thấy {results.length} sản phẩm</p>
        )}

        {loading ? (
          <div className="loading-container">
            <p>⏳ Đang tải...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="no-products">
            <p>Không tìm thấy sản phẩm</p>
          </div>
        ) : (
          <>
            {showSuccessMessage && (
              <div className="success-message">Đã thêm vào giỏ hàng!</div>
            )}
            {error && <p className="error-message">{error}</p>}
            <div className="menu-lists">
              {results.map((item) => {
                const firstPrice = item.productPrices?.[0] || null;
                const price = firstPrice ? Number(firstPrice.optionPrice) : 0;

                return (
                  <div className="food-items" key={item.productId}>
                    <div
                      className="food-item"
                      onClick={() =>
                        navigate(
                          `/product/${encodeURIComponent(
                            item.categoryName || "category"
                          )}/${item.productId}`
                        )
                      }
                    >
                      <img src={item.image} alt={item.name} />
                      <h2>{item.name}</h2>
                    </div>

                    <div className="food-price">
                      <span className="current-price">
                        {price > 0
                          ? `${price.toLocaleString()} VND`
                          : "Giá chưa cập nhật"}
                      </span>
                    </div>

                    <div className="food-meta">
                      <span>⭐ {parseFloat(item.rating || 0).toFixed(2)}</span>
                      <span>Đã bán {item.sold || 0}</span>
                    </div>

                    <button
                      className="add-to-cart-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                    >
                      🛒
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default SearchResults;
