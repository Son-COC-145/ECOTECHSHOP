// src/components/menu/Menu.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import "../../styles/Menu.css";
import { apiConfig } from "../../config/api";

const PAGE_SIZE = 20;

function PageNumbers({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
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

function Menu({
  filterCategoryIds = [],
  activeCategoryName = null,
  onClearCategory,
  minPrice = "",
  maxPrice = "",
  minRating = "",
  onClearPriceFilter,
  onClearRatingFilter,
}) {
  const [allProducts, setAllProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [error, setError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [page, setPage] = useState(1);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  const BASE_URL =
    apiConfig?.baseURL ||
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000";

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const all = await axios.get(`${BASE_URL}/api/products`);
        const productList =
          all.data.products || all.data || all.data.recordset || [];

        const productsWithPrice = await Promise.all(
          productList.map(async (p) => {
            const priceRes = await axios.get(
              `${BASE_URL}/api/prices?productId=${p.productId}`
            );
            return { ...p, productPrices: priceRes.data.data || [] };
          })
        );

        setAllProducts(productsWithPrice);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu sản phẩm");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [BASE_URL]);

  // Reset to page 1 on filter/sort/category change
  useEffect(() => {
    setPage(1);
  }, [filterCategoryIds, minPrice, maxPrice, minRating, sortOption]);

  // Derived: filtered + sorted full dataset
  const sortedFilteredItems = useMemo(() => {
    const getPrice = (p) => Number(p.productPrices?.[0]?.optionPrice || 0);

    let items =
      filterCategoryIds.length === 0
        ? allProducts
        : allProducts.filter((item) =>
            filterCategoryIds.includes(item.categoryId)
          );

    if (minPrice) items = items.filter((p) => getPrice(p) >= Number(minPrice));
    if (maxPrice) items = items.filter((p) => getPrice(p) <= Number(maxPrice));
    if (minRating)
      items = items.filter((p) => (p.rating || 0) >= Number(minRating));

    const arr = [...items];
    switch (sortOption) {
      case "low-to-high":
        return arr.sort((a, b) => getPrice(a) - getPrice(b));
      case "high-to-low":
        return arr.sort((a, b) => getPrice(b) - getPrice(a));
      case "best-seller":
        return arr.sort((a, b) => (b.sold || 0) - (a.sold || 0));
      case "rating":
        return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return arr;
    }
  }, [allProducts, filterCategoryIds, minPrice, maxPrice, minRating, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredItems.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sortedFilteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedFilteredItems, page]
  );

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = sortedFilteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, sortedFilteredItems.length);

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
      attributes: { optionName },
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

  if (loadingProducts) {
    return (
      <section className="menu">
        <div className="menu-main-content">
          <div className="search-header-compact">
            <h2 className="search-title-compact">Đang tải sản phẩm...</h2>
          </div>
          <div className="menu-products">
            <div className="menu-lists search-skeleton-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="menu">
      <div className="menu-main-content">
        {/* COMPACT HEADER */}
        <div className="search-header-compact">
          <h2 className="search-title-compact">
            <span className="search-keyword">
              {activeCategoryName || "Tất cả sản phẩm"}
            </span>
          </h2>
          {sortedFilteredItems.length > 0 && (
            <span className="search-count-compact">
              {sortedFilteredItems.length} sản phẩm &nbsp;·&nbsp; {start}–{end} trên trang
            </span>
          )}
        </div>

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
                {minPrice ? `từ ${Number(minPrice).toLocaleString()}đ` : ""}
                {minPrice && maxPrice ? " – " : ""}
                {maxPrice ? `đến ${Number(maxPrice).toLocaleString()}đ` : ""}
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
                  onClick={() => onClearRatingFilter && onClearRatingFilter()}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        <div className="menu-products">
          {/* SORT TABS */}
          <div className="sort-tabs">
            {[
              { value: "default", label: "Mặc định" },
              { value: "best-seller", label: "Bán chạy" },
              { value: "low-to-high", label: "Giá ↑" },
              { value: "high-to-low", label: "Giá ↓" },
              { value: "rating", label: "Đánh giá" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`sort-tab-btn ${sortOption === opt.value ? "active" : ""}`}
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

          <div className="menu-lists">
            {sortedFilteredItems.length === 0 ? (
              <div className="no-products">
                <p>Không có sản phẩm nào</p>
              </div>
            ) : (
              pageItems.map((item) => {
                const firstPrice = item.productPrices?.[0] || null;
                const price = firstPrice ? Number(firstPrice.optionPrice) : 0;
                return (
                  <div className="food-items" key={item.productId}>
                    <div
                      className="food-item"
                      onClick={() =>
                        navigate(
                          `/product/${encodeURIComponent(item.categoryName)}/${item.productId}`
                        )
                      }
                    >
                      <img src={item.image} alt={item.name} />
                      <h2>{item.name}</h2>
                    </div>
                    <div className="food-price">
                      <span className="current-price">
                        {price.toLocaleString()} VND
                      </span>
                    </div>
                    <div className="food-meta">
                      <span>⭐ {parseFloat(item.rating || 5).toFixed(2)}</span>
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

          <PageNumbers page={page} totalPages={totalPages} onPageChange={goToPage} />
        </div>
      </div>
    </section>
  );
}

export default Menu;
