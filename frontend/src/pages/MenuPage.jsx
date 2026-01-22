// src/pages/MenuPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import CategorySidebar from "../components/home/CategorySidebar";
import SideBanner from "../components/layout/SideBanner";
import Menu from "../components/product/Menu"; // nếu Menu nằm ở src/components/Menu.jsx

const MenuPage = () => {
  const location = useLocation();

  // state nhận được khi điều hướng từ HomePage
  const initialCategoryIds = location.state?.categoryIds || [];
  const initialActiveCategoryId =
    location.state?.activeCategoryId ?? (initialCategoryIds[0] ?? null);

  // category đang được chọn (dùng highlight sidebar)
  const [activeCategoryId, setActiveCategoryId] =
    useState(initialActiveCategoryId);

  // danh sách categoryId để lọc sản phẩm trong Menu
  const [filterCategoryIds, setFilterCategoryIds] =
    useState(initialCategoryIds);

  // nếu từ HomePage sang với category mới thì cập nhật lại filter
  useEffect(() => {
    if (location.state?.categoryIds) {
      const ids = location.state.categoryIds;
      const active =
        location.state.activeCategoryId ?? (ids[0] ?? null);

      setFilterCategoryIds(ids);
      setActiveCategoryId(active);
    }
  }, [location.state?.categoryIds, location.state?.activeCategoryId]);

  /**
   * Handle click từ sidebar trong chính MenuPage
   * @param {object} category - danh mục được click (parent hoặc child)
   * @param {object|null} parent - null nếu click parent, là cha nếu click child
   * @param {array|undefined} children - nếu click parent thì là list con, nếu click child thì undefined
   */
  const handleCategoryClick = (category, parent, children) => {
    setActiveCategoryId(category.categoryId);

    if (Array.isArray(children) && children.length > 0) {
      // 👉 CLICK CATEGORY BẬC 1: lọc theo cha + tất cả con
      const ids = [
        category.categoryId,
        ...children.map((c) => c.categoryId),
      ];
      setFilterCategoryIds(ids);
    } else {
      // 👉 CLICK CATEGORY BẬC 2: chỉ lọc theo con
      setFilterCategoryIds([category.categoryId]);
    }
  };

  // convert sang object id -> true cho Menu.jsx
  const selectedCategories = filterCategoryIds.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});

  return (
    <div className="main-content">
      <div className="layout-with-sidebar">
        {/* Cột trái: danh mục lọc */}
        <CategorySidebar
          mode="menu"
          activeCategoryId={activeCategoryId}
          onCategoryClick={handleCategoryClick}
        />

        {/* Cột giữa: danh sách sản phẩm */}
        <div className="layout-main">
          <Menu selectedCategories={selectedCategories} />
        </div>

        {/* Cột phải: banner quảng cáo */}
        <SideBanner />
      </div>
    </div>
  );
};

export default MenuPage;