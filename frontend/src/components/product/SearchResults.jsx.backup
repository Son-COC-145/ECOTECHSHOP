import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../layout/Header";
import { useCart } from "../../context/CartContext";
import "../../styles/SearchResults.css";
import "../../styles/Menu.css";
import { apiConfig } from "../../config/api";

function SearchResults() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [displayedResults, setDisplayedResults] = useState([]); // ✅ State cho kết quả sau khi sort
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [sortOption, setSortOption] = useState("default"); // ✅ State cho sort option
  
  // ✅ Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // ✅ Filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minRating, setMinRating] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // ✅ Spell correction state
  const [spellCorrection, setSpellCorrection] = useState(null);
  
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const BASE_URL =
    apiConfig?.baseURL ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  // ✅ Build filter query params
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','));
    if (minRating) params.append('minRating', minRating);
    return params.toString();
  };

  // 🚀 LOAD KẾT QUẢ TÌM KIẾM
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      setDisplayedResults([]);
      setPage(1);
      setHasMore(false);
      setTotal(0);
      return;
    }

    // Reset khi keyword thay đổi
    setResults([]);
    setDisplayedResults([]);
    setPage(1);
    setLoading(true);

    const filterParams = buildFilterParams();
    const url = `${BASE_URL}/api/search/semantic?q=${encodeURIComponent(keyword)}&page=1&limit=20${filterParams ? '&' + filterParams : ''}`;

    axios
      .get(url)
      .then((res) => {
        // ✅ Backend trả về { results, total, page, totalPages, hasMore }
        const data = res.data;
        const raw = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);

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
        setDisplayedResults(normalized);
        setHasMore(data.hasMore || false);
        setTotal(data.total || normalized.length);
        setSpellCorrection(data.spellCorrection || null);
      })
      .catch((err) => {
        console.error("❌ Lỗi tìm kiếm:", err);
        setResults([]);
        setDisplayedResults([]);
        setHasMore(false);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [keyword, BASE_URL, minPrice, maxPrice, selectedCategories, minRating]);

  // ✅ XỬ LÝ SẮP XẾP
  useEffect(() => {
    if (results.length === 0) {
      setDisplayedResults([]);
      return;
    }

    let sortedResults = [...results];

    const getFirstPrice = (product) => {
      const firstPrice = product.productPrices?.[0];
      return firstPrice ? Number(firstPrice.optionPrice || 0) : 0;
    };

    switch (sortOption) {
      case "low-to-high":
        sortedResults.sort((a, b) => getFirstPrice(a) - getFirstPrice(b));
        break;

      case "high-to-low":
        sortedResults.sort((a, b) => getFirstPrice(b) - getFirstPrice(a));
        break;

      case "best-seller":
        sortedResults.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;

      case "rating":
        sortedResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;

      case "relevance":
        // Sắp xếp theo độ liên quan (similarity score từ AI)
        sortedResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
        break;

      case "default":
      default:
        // Giữ nguyên thứ tự từ backend (đã được AI rank)
        break;
    }

    setDisplayedResults(sortedResults);
  }, [sortOption, results]);

  // ✅ Load more data (Infinite Scroll)
  const loadMore = () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    const filterParams = buildFilterParams();
    const url = `${BASE_URL}/api/search/semantic?q=${encodeURIComponent(keyword)}&page=${nextPage}&limit=20${filterParams ? '&' + filterParams : ''}`;

    axios
      .get(url)
      .then((res) => {
        const data = res.data;
        const raw = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);

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

        setResults(prev => [...prev, ...normalized]);
        setPage(nextPage);
        setHasMore(data.hasMore || false);
      })
      .catch((err) => {
        console.error("❌ Lỗi load more:", err);
      })
      .finally(() => setLoadingMore(false));
  };

  // ✅ Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      // Trigger khi còn 200px nữa là hết trang
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, keyword]);

  // ✅ Handle add to cart
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
        {/* ✅ SEARCH HEADER */}
        <div className="search-header">
          <div className="search-info">
            <div className="search-title-wrapper">
              <h2 className="search-title">
                Kết quả tìm kiếm cho: <span className="keyword">"{keyword}"</span>
              </h2>
              {!loading && (
                <p className="search-subtitle">
                  Tìm thấy {total} sản phẩm (Hiển thị {displayedResults.length})
                </p>
              )}
            </div>

            {/* ✅ SORT DROPDOWN */}
            <div className="sort-section">
              <label>Sắp xếp:</label>
              <select
                className="sort-dropdown"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="default">Mặc định (AI Ranking)</option>
                <option value="relevance">Độ liên quan cao nhất</option>
                <option value="low-to-high">Giá thấp → cao</option>
                <option value="high-to-low">Giá cao → thấp</option>
                <option value="best-seller">Bán chạy nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ SPELL CORRECTION SUGGESTION */}
        {spellCorrection && (
          <div className="spell-correction-banner">
            <p>
              Bạn có phải muốn tìm: <strong>"{spellCorrection.suggested}"</strong>?
              <span className="original-query"> (Đã tìm cho: "{spellCorrection.original}")</span>
            </p>
          </div>
        )}

        {/* ✅ FILTER TOGGLE BUTTON */}
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '✕ Đóng bộ lọc' : '🔍 Hiển thị bộ lọc'}
        </button>

        {/* ✅ FILTER PANEL */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-section">
              <h4>Giá (VND)</h4>
              <div className="filter-inputs">
                <input
                  type="number"
                  placeholder="Giá tối thiểu"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Giá tối đa"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-section">
              <h4>Danh mục</h4>
              <div className="filter-checkboxes">
                {['điện thoại', 'laptop', 'tai nghe', 'đồng hồ', 'tablet'].map(cat => (
                  <label key={cat}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat));
                        }
                      }}
                    />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Đánh giá tối thiểu</h4>
              <select
                className="filter-select"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="4">⭐ 4 sao trở lên</option>
                <option value="3">⭐ 3 sao trở lên</option>
                <option value="2">⭐ 2 sao trở lên</option>
              </select>
            </div>

            <button 
              className="filter-clear-btn"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setSelectedCategories([]);
                setMinRating("");
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        <h2 className="search-title">Kết quả tìm kiếm cho: "{keyword}"</h2>

        {!loading && (
          <p className="search-subtitle">
            Tìm thấy {total} sản phẩm (Hiển thị {displayedResults.length})
          </p>
        )}

        {loading ? (
          <div className="loading-container">
            <p>⏳ Đang tải...</p>
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="no-products">
            <p>Không tìm thấy sản phẩm</p>
          </div>
        ) : (
          <>
            {showSuccessMessage && (
              <div className="success-message">Đã thêm vào giỏ hàng!</div>
            )}
            {error && <p className="error-message">{error}</p>}

            {/* ✅ GRID SẢN PHẨM */}
            <div className="menu-lists">
                {displayedResults.map((item) => {
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
                        {item.similarity != null && (
                          <span className="similarity-badge">
                            🎯 {(item.similarity * 100).toFixed(0)}%
                          </span>
                        )}
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

              {/* ✅ LOADING MORE INDICATOR */}
              {loadingMore && (
                <div className="loading-more">
                  <p>⏳ Đang tải thêm...</p>
                </div>
              )}

              {/* ✅ END OF RESULTS */}
              {!hasMore && displayedResults.length > 0 && (
                <div className="end-of-results">
                  <p>✅ Đã hiển thị tất cả {total} kết quả</p>
                </div>
              )}
          </>
        )}
      </div>
    </>
  );
}

export default SearchResults;