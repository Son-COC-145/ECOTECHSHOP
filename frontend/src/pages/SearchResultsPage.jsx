// src/pages/SearchResultsPage.jsx
import React, { useState } from "react";
import CategorySidebar from "../components/home/CategorySidebar";
import SideBanner from "../components/layout/SideBanner";
import SearchResults from "../components/product/SearchResults";

const SearchResultsPage = () => {
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [activeCategoryName, setActiveCategoryName] = useState(null);
  const [filterCategoryIds, setFilterCategoryIds] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");

  const handleCategoryClick = (category, parent, children) => {
    setActiveCategoryId(category.categoryId);
    setActiveCategoryName(category.name);

    if (Array.isArray(children) && children.length > 0) {
      // Click danh mục cha: lọc cha + tất cả con
      setFilterCategoryIds([
        category.categoryId,
        ...children.map((c) => c.categoryId),
      ]);
    } else {
      // Click danh mục con: chỉ lọc con đó
      setFilterCategoryIds([category.categoryId]);
    }
  };

  const handleResetCategory = () => {
    setActiveCategoryId(null);
    setActiveCategoryName(null);
    setFilterCategoryIds([]);
  };

  const handleClearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
  };

  return (
    <div className="main-content">
      <div className="layout-with-sidebar">
        {/* Cột trái: danh mục + bộ lọc */}
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
          onClearFilters={handleClearFilters}
        />

        {/* Cột giữa: kết quả tìm kiếm */}
        <div className="layout-main">
          <SearchResults
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

        {/* Cột phải: banner */}
        <SideBanner />
      </div>
    </div>
  );
};

export default SearchResultsPage;
