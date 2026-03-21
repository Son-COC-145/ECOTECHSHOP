import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../../context/CartContext";
import "../../styles/Menu.css";
import { apiConfig } from "../../config/api";

const PAGE_SIZE = 20;

// Shopee/Tiki-style page numbers with ellipsis
function PageNumbers({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2; // how many pages around current to show

  const range = [];
  for (
    let i = Math.max(2, page - delta);
    i <= Math.min(totalPages - 1, page + delta);
    i++
  ) {
    range.push(i);
  }

  if (range[0] > 2) range.unshift("...");
  if (range[range.length - 1] < totalPages - 1) range.push("...");

  pages.push(1);
  pages.push(...range);
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="search-pagination">
      <button
        className="page-btn page-prev"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹ Trước
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="page-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`page-btn ${p === page ? "active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="page-btn page-next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau ›
      </button>
    </div>
  );
}

function SearchResults({
  filterCategoryIds = [],
  activeCategoryName = null,
  onClearCategory,
  minPrice = "",
  maxPrice = "",
  minRating = "",
  onClearPriceFilter,
  onClearRatingFilter,
}) {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

  // All results fetched from server (up to 200)
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [sortOption, setSortOption] = useState("relevance");
  const [page, setPage] = useState(1);
  const [spellCorrection, setSpellCorrection] = useState(null);

  const navigate = useNavigate();
  const { addToCart } = useCart();

  const BASE_URL =
    apiConfig?.baseURL ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  // ── FETCH: keyword/filter change → get ALL results (limit=200), reset to page 1 ──
  useEffect(() => {
    if (!keyword.trim()) {
      setAllResults([]);
      setPage(1);
      setSpellCorrection(null);
      return;
    }

    setLoading(true);
    setAllResults([]);
    setPage(1);

    const params = new URLSearchParams({ q: keyword, page: 1, limit: 200 });
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (filterCategoryIds.length > 0)
      params.append("categoryIds", filterCategoryIds.join(","));
    if (minRating) params.append("minRating", minRating);

    axios
      .get(`${BASE_URL}/api/search/semantic?${params.toString()}`)
      .then((res) => {
        const data = res.data;
        const raw = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        const normalized = raw.map((item) => ({
          productId: item.productId,
          name: item.name,
          image: item.image,
          similarity: item.similarity ?? null,
          productPrices: item.productPrices || [],
          rating: item.rating || 0,
          sold: item.sold || 0,
          categoryName: item.categoryName || "",
          brandName: item.brandName || "",
        }));
        setAllResults(normalized);
        setSpellCorrection(data.spellCorrection || null);
      })
      .catch((err) => {
        console.error("❌ Lỗi tìm kiếm:", err);
        setAllResults([]);
      })
      .finally(() => setLoading(false));
  }, [keyword, BASE_URL, minPrice, maxPrice, filterCategoryIds, minRating]);

  // ── Sort change → reset to page 1 ──
  useEffect(() => {
    setPage(1);
  }, [sortOption]);

  // ── Derived: sorted ALL results (client-side, always on full set) ──
  const sortedResults = useMemo(() => {
    const getPrice = (item) =>
      Number(item.productPrices?.[0]?.optionPrice || 0);

    const arr = [...allResults];
    switch (sortOption) {
      case "low-to-high":
        return arr.sort((a, b) => getPrice(a) - getPrice(b));
      case "high-to-low":
        return arr.sort((a, b) => getPrice(b) - getPrice(a));
      case "best-seller":
        return arr.sort((a, b) => (b.sold || 0) - (a.sold || 0));
      case "rating":
        return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "relevance":
        return arr.sort(
          (a, b) => (b.similarity || 0) - (a.similarity || 0)
        );
      default:
        return arr;
    }
  }, [allResults, sortOption]);

  // ── Derived: current page slice ──
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sortedResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedResults, page]
  );

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle add to cart
  const handleAddToCart = async (item) => {
    const firstPrice = item.productPrices?.[0];
    if (!firstPrice) {
      setError("Sản phẩm chưa có giá");
      return;
    }
    const cartItem = {
      productId: item.productId,
      name: item.name,
      price: Number(firstPrice.optionPrice),
      image: item.image,
      quantity: 1,
      categoryName: item.categoryName,
      brandName: item.brandName,
      productPriceId: firstPrice.priceId,
      optionName: firstPrice.optionName,
      attributes: { optionName: firstPrice.optionName },
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

  const start = sortedResults.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, sortedResults.length);

  return (
    <>
      <section className="menu">
        <div className="menu-main-content">
          {/* HEADER: keyword + count */}
          <div className="search-header-compact">
            <h2 className="search-title-compact">
              {keyword ? (
                <>
                  Kết quả:{" "}
                  <span className="search-keyword">"{keyword}"</span>
                  <button
                    type="button"
                    className="clear-keyword-btn"
                    onClick={() => navigate("/search")}
                    aria-label="Xóa từ khóa tìm kiếm"
                    title="Xóa từ khóa"
                  >
                    × Xóa
                  </button>
                </>
              ) : (
                "Tìm kiếm sản phẩm"
              )}
            </h2>
            {!loading && sortedResults.length > 0 && (
              <span className="search-count-compact">
                {sortedResults.length} sản phẩm &nbsp;·&nbsp; {start}–{end} trên trang
              </span>
            )}
          </div>

          {/* SPELL CORRECTION — clickable suggestion */}
          {spellCorrection && (
            <div className="spell-correction-banner">
              <p>
                Ý bạn là:{" "}
                <button
                  type="button"
                  className="spell-suggestion-btn"
                  onClick={() =>
                    navigate(
                      `/search?q=${encodeURIComponent(spellCorrection.suggested)}`
                    )
                  }
                >
                  {spellCorrection.suggested}
                </button>
                ?
              </p>
            </div>
          )}

          {/* ACTIVE FILTER CHIPS */}
          {(activeCategoryName || minPrice || maxPrice || minRating) && (
            <div className="active-filters-bar">
              {activeCategoryName && (
                <span className="filter-chip">
                  {activeCategoryName}
                  <button
                    type="button"
                    className="filter-chip-remove"
                    onClick={() => onClearCategory && onClearCategory()}
                  >
                    ×
                  </button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="filter-chip">
                  Giá:{" "}
                  {minPrice
                    ? `từ ${Number(minPrice).toLocaleString()}đ`
                    : ""}
                  {minPrice && maxPrice ? " – " : ""}
                  {maxPrice
                    ? `đến ${Number(maxPrice).toLocaleString()}đ`
                    : ""}
                  <button
                    type="button"
                    className="filter-chip-remove"
                    onClick={() => onClearPriceFilter && onClearPriceFilter()}
                  >
                    ×
                  </button>
                </span>
              )}
              {minRating && (
                <span className="filter-chip">
                  ⭐ {minRating}+ sao
                  <button
                    type="button"
                    className="filter-chip-remove"
                    onClick={() =>
                      onClearRatingFilter && onClearRatingFilter()
                    }
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          {/* PRODUCT AREA */}
          <div className="menu-products">
            {/* SORT TABS */}
            <div className="sort-tabs">
              {[
                { value: "relevance", label: "Liên quan" },
                { value: "best-seller", label: "Bán chạy" },
                { value: "low-to-high", label: "Giá ↑" },
                { value: "high-to-low", label: "Giá ↓" },
                { value: "rating", label: "Đánh giá" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sort-tab-btn ${
                    sortOption === opt.value ? "active" : ""
                  }`}
                  onClick={() => setSortOption(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {showSuccessMessage && (
              <div className="success-message">Đã thêm vào giỏ hàng!</div>
            )}
            {error && <p className="error-message">{error}</p>}

            {/* PRODUCT GRID */}
            <div className="menu-lists">
              {loading ? (
                <div className="loading-container">
                  <div className="search-skeleton-grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="skeleton-card" />
                    ))}
                  </div>
                </div>
              ) : pageItems.length === 0 ? (
                <div className="no-products">
                  {keyword ? (
                    <p>Không tìm thấy sản phẩm phù hợp với "{keyword}"</p>
                  ) : (
                    <p>Nhập từ khóa để tìm kiếm sản phẩm</p>
                  )}
                </div>
              ) : (
                pageItems.map((item) => {
                  const firstPrice = item.productPrices?.[0] || null;
                  const price = firstPrice
                    ? Number(firstPrice.optionPrice)
                    : 0;
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
                        <span>⭐ {parseFloat(item.rating || 0).toFixed(1)}</span>
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
                })
              )}
            </div>

            {/* PAGINATION */}
            {!loading && sortedResults.length > 0 && (
              <PageNumbers
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default SearchResults;
