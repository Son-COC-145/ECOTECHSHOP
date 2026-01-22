// src/components/home/CategorySidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchCategories } from "../../services/menuApi";
import "../../styles/CategorySidebar.css";

/**
 * props:
 * - mode: "home" | "menu"
 * - activeCategoryId: id được chọn (highlight)
 * - onCategoryClick: (category, parent, children) => void
 */
function CategorySidebar({
  mode = "menu",
  activeCategoryId,
  onCategoryClick,
  loadingProducts,
  error,
}) {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState(null);

  // chỉ dùng trong mode="menu"
  const [activeParentId, setActiveParentId] = useState(null);

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

  const activeNode =
    activeParentId != null
      ? categoryTree.find((t) => t.parent.categoryId === activeParentId)
      : null;

  const mergedError = catError || error;

  return (
    <aside className="category-sidebar">
      {/* HEADER */}
      <div className="category-header">
        {mode === "menu" && activeParentId != null ? (
          <button
            type="button"
            className="category-back-btn"
            onClick={() => setActiveParentId(null)}
          >
            ← Danh mục
          </button>
        ) : (
          <h3>Danh mục</h3>
        )}
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
            MODE MENU – chọn cha → chọn con
        ========================= */}
        {mode === "menu" && (
          <>
            {/* VIEW 1: tất cả cha */}
            {activeParentId == null &&
              !loadingCats &&
              !mergedError &&
              categoryTree.map(({ parent, children }) => (
                <button
                  key={parent.categoryId}
                  type="button"
                  className={`category-parent-row ${
                    activeCategoryId === parent.categoryId ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveParentId(parent.categoryId);

                    // báo về parent + children để MenuPage lọc ALL
                    onCategoryClick &&
                      onCategoryClick(parent, null, children);
                  }}
                >
                  <div className="category-parent-text">
                    <span className="parent-name">{parent.name}</span>
                    {children.length > 0 && (
                      <span className="parent-count">
                        {children.length} loại
                      </span>
                    )}
                  </div>
                  <span className="parent-arrow">›</span>
                </button>
              ))}

            {/* VIEW 2: 1 cha + danh sách con */}
            {activeParentId != null && activeNode && (
              <div className="category-subview">
                <div className="category-parent-subheader">
                  <span className="parent-name">
                    {activeNode.parent.name}
                  </span>
                </div>

                <div className="category-children">
                  {activeNode.children.length === 0 && (
                    <p className="no-children-text">
                      Danh mục này chưa có danh mục con.
                    </p>
                  )}

                  {activeNode.children.map((child) => (
                    <button
                      key={child.categoryId}
                      type="button"
                      className={`category-child ${
                        activeCategoryId === child.categoryId ? "active" : ""
                      }`}
                      onClick={() =>
                        onCategoryClick &&
                        onCategoryClick(child, activeNode.parent)
                      }
                    >
                      <span>{child.name}</span>
                      <span className="parent-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

export default CategorySidebar;
