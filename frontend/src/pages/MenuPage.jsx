// src/pages/MenuPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import CategorySidebar from "../components/home/CategorySidebar";
import SideBanner from "../components/layout/SideBanner";
import Menu from "../components/product/Menu";

const MenuPage = () => {
  const location = useLocation();

  const initialCategoryIds = location.state?.categoryIds || [];
  const initialActiveCategoryId =
    location.state?.activeCategoryId ?? (initialCategoryIds[0] ?? null);

  const [activeCategoryId, setActiveCategoryId] =
    useState(initialActiveCategoryId);
  const [filterCategoryIds, setFilterCategoryIds] =
    useState(initialCategoryIds);
  const [activeCategoryName, setActiveCategoryName] = useState(
    location.state?.activeCategoryName || null
  );

  // Filter state lifted here — passed to both CategorySidebar and Menu
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");

  useEffect(() => {
    if (location.state?.categoryIds) {
      const ids = location.state.categoryIds;
      const active = location.state.activeCategoryId ?? (ids[0] ?? null);
      setFilterCategoryIds(ids);
      setActiveCategoryId(active);
      setActiveCategoryName(location.state?.activeCategoryName || null);
    }
  }, [location.state?.categoryIds, location.state?.activeCategoryId]);

  const handleCategoryClick = (category, parent, children) => {
    setActiveCategoryId(category.categoryId);
    setActiveCategoryName(category.name || null);

    if (Array.isArray(children) && children.length > 0) {
      const ids = [
        category.categoryId,
        ...children.map((c) => c.categoryId),
      ];
      setFilterCategoryIds(ids);
    } else {
      setFilterCategoryIds([category.categoryId]);
    }
  };

  const handleResetCategory = () => {
    setActiveCategoryId(null);
    setFilterCategoryIds([]);
    setActiveCategoryName(null);
  };

  return (
    <div className="main-content">
      <div className="layout-with-sidebar">
        {/* Left column: category + filter sidebar */}
        <CategorySidebar
          mode="menu"
          activeCategoryId={activeCategoryId}
          onCategoryClick={handleCategoryClick}
          onResetCategory={handleResetCategory}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minRating={minRating}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onMinRatingChange={setMinRating}
          onClearFilters={() => {
            setMinPrice("");
            setMaxPrice("");
            setMinRating("");
          }}
        />

        {/* Center column: product list */}
        <div className="layout-main">
          <Menu
            filterCategoryIds={filterCategoryIds}
            activeCategoryName={activeCategoryName}
            onClearCategory={handleResetCategory}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minRating={minRating}
            onClearPriceFilter={() => { setMinPrice(""); setMaxPrice(""); }}
            onClearRatingFilter={() => setMinRating("")}
          />
        </div>

        {/* Right column: ad banner */}
        <SideBanner />
      </div>
    </div>
  );
};

export default MenuPage;