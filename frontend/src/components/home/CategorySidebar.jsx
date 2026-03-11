// src/components/home/CategorySidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchCategories } from "../../services/menuApi";
import "../../styles/CategorySidebar.css";

/**
 * props:
 * - mode: "home" | "menu"
 * - activeCategoryId: id được chọn (highlight)
 * - onCategoryClick: (category, parent, children) => void
 * - onResetCategory: () => void  — "Tất cả danh mục"
 * === Filter props (mode="menu" only) ===
 * - minPrice, maxPrice, minRating
 * - onMinPriceChange, onMaxPriceChange, onMinRatingChange
 * - onClearFilters
 */
function CategorySidebar({
  mode = "menu",
  activeCategoryId,
  onCategoryClick,
  onResetCategory,
  loadingProducts,
  error,
  // filter props
  minPrice = "",
  maxPrice = "",
  minRating = "",
  onMinPriceChange,
  onMaxPriceChange,
  onMinRatingChange,
  onClearFilters,
}) {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState(null);

  // accordion: Set of expanded parent ids
  const [expandedParentIds, setExpandedParentIds] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCats(true);
        const cats = await fetchCategories();
        setCategories(cats || []);
      } catch (e) {
        console.error(e);
        setCatError("Không thể tải danh mục");
      } finally {
        setLoadingCats(false);
      }
    };
    load();
  }, []);

  // Build tree cha/con
  const categoryTree = useMemo(() => {
    const parents = categories.filter((c) => !c.parentId);
    const childrenByParent = categories.reduce((acc, c) => {
      if (c.parentId) {
        if (!acc[c.parentId]) acc[c.parentId] = [];
        acc[c.parentId] = [...acc[c.parentId], c];
      }
      return acc;
    }, {});
    return parents.map((p) => ({
      parent: p,
      children: childrenByParent[p.categoryId] || [],
    }));
  }, [categories]);

  // Auto-expand parent when a child is active
  useEffect(() => {
    if (!activeCategoryId || mode !== "menu") return;
    const parentNode = categoryTree.find((t) =>
      t.children.some((c) => c.categoryId === activeCategoryId)
    );
    if (parentNode) {
      setExpandedParentIds((prev) => {
        if (prev.has(parentNode.parent.categoryId)) return prev;
        return new Set([...prev, parentNode.parent.categoryId]);
      });
    }
  }, [activeCategoryId, categoryTree, mode]);

  const toggleExpand = (parentId) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const mergedError = catError || error;
  const hasActiveFilters = minPrice || maxPrice || minRating;

  return (
    <aside className="category-sidebar">
      {/* HEADER */}
      <div className="category-header">
        <h3>Danh mục</h3>
      </div>

      {/* STATUS */}
      {loadingCats && <p className="loading-message">Đang tải danh mục...</p>}
      {mergedError && <p className="error-message">{mergedError}</p>}
      {mode === "menu" && loadingProducts && !loadingCats && (
        <p className="loading-message">Đang tải sản phẩm...</p>
      )}

      <div className="category-checkbox">
        {/* =========================
            MODE HOME – chỉ hiển thị danh mục cha
        ========================= */}
        {mode === "home" &&
          !loadingCats &&
          !mergedError &&
          categoryTree.map(({ parent, children }) => (
            <button
              key={parent.categoryId}
              type="button"
              className={`category-parent-row ${
                activeCategoryId === parent.categoryId ? "active" : ""
              }`}
              onClick={() =>
                onCategoryClick && onCategoryClick(parent, null, children)
              }
            >
              <div className="category-parent-text">
                <span className="parent-name">{parent.name}</span>
                {children.length > 0 && (
                  <span className="parent-count">{children.length} loại</span>
                )}
              </div>
              <span className="parent-arrow">›</span>
            </button>
          ))}

        {/* =========================
            MODE MENU – accordion expand/collapse
        ========================= */}
        {mode === "menu" && !loadingCats && !mergedError && (
          <>
            {/* Tất cả danh mục */}
            <button
              type="button"
              className={`category-all-btn ${activeCategoryId == null ? "active" : ""}`}
              onClick={() => onResetCategory && onResetCategory()}
            >
              Tất cả danh mục
            </button>

            {categoryTree.map(({ parent, children }) => {
              const isExpanded = expandedParentIds.has(parent.categoryId);
              const isParentOrChildActive =
                activeCategoryId === parent.categoryId ||
                children.some((c) => c.categoryId === activeCategoryId);

              return (
                <div key={parent.categoryId} className="category-accordion-item">
                  <button
                    type="button"
                    className={`category-parent-row ${isParentOrChildActive ? "active" : ""}`}
                    onClick={() => {
                      toggleExpand(parent.categoryId);
                      onCategoryClick && onCategoryClick(parent, null, children);
                    }}
                  >
                    <div className="category-parent-text">
                      <span className="parent-name">{parent.name}</span>
                      {children.length > 0 && (
                        <span className="parent-count">{children.length} loại</span>
                      )}
                    </div>
                    <span className={`parent-arrow ${isExpanded ? "rotated" : ""}`}>›</span>
                  </button>

                  {isExpanded && children.length > 0 && (
                    <div className="category-accordion-children">
                      {children.map((child) => (
                        <button
                          key={child.categoryId}
                          type="button"
                          className={`category-child ${
                            activeCategoryId === child.categoryId ? "active" : ""
                          }`}
                          onClick={() =>
                            onCategoryClick && onCategoryClick(child, parent)
                          }
                        >
                          <span>{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* =========================
          FILTER SECTION (mode="menu" only, only when callbacks provided)
      ========================= */}
      {mode === "menu" && !loadingCats && !mergedError && onMinPriceChange && (
        <div className="sidebar-filter-section">
          <div className="sidebar-filter-header">
            <h3>Bộ lọc</h3>
            {hasActiveFilters && (
              <button
                type="button"
                className="sidebar-filter-clear"
                onClick={() => onClearFilters && onClearFilters()}
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Giá */}
          <div className="sidebar-filter-group">
            <label className="sidebar-filter-label">Khoảng giá (VNĐ)</label>
            <div className="sidebar-price-inputs">
              <input
                type="number"
                placeholder="Tối thiểu"
                value={minPrice}
                min="0"
                onChange={(e) => onMinPriceChange && onMinPriceChange(e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                placeholder="Tối đa"
                value={maxPrice}
                min="0"
                onChange={(e) => onMaxPriceChange && onMaxPriceChange(e.target.value)}
              />
            </div>
            <div className="sidebar-price-presets">
              {[
                { label: "Dưới 1 triệu", min: "", max: "1000000" },
                { label: "1 – 5 triệu", min: "1000000", max: "5000000" },
                { label: "5 – 10 triệu", min: "5000000", max: "10000000" },
                { label: "Trên 10 triệu", min: "10000000", max: "" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`price-preset-btn ${
                    minPrice === preset.min && maxPrice === preset.max ? "active" : ""
                  }`}
                  onClick={() => {
                    onMinPriceChange && onMinPriceChange(preset.min);
                    onMaxPriceChange && onMaxPriceChange(preset.max);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Đánh giá */}
          <div className="sidebar-filter-group">
            <label className="sidebar-filter-label">Đánh giá tối thiểu</label>
            <div className="sidebar-rating-options">
              {[
                { value: "", label: "Tất cả" },
                { value: "4", label: "⭐⭐⭐⭐ trở lên" },
                { value: "3", label: "⭐⭐⭐ trở lên" },
                { value: "2", label: "⭐⭐ trở lên" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`rating-option-btn ${minRating === opt.value ? "active" : ""}`}
                  onClick={() => onMinRatingChange && onMinRatingChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default CategorySidebar;
