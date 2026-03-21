// src/pages/HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

import CategorySidebar from "../components/home/CategorySidebar";
import SideBanner from "../components/layout/SideBanner";
import SummerBanner from "../components/layout/SummerBanner";
import BigImage from "../components/home/BigImage";
import About from "../components/home/About";
import RecommendationBar from "../components/home/RecommendationBar";
import NcfRecommendation from "../components/home/NcfRecommendation";
import Team from "../components/home/Team";

const HomePage = () => {
  const navigate = useNavigate();

  const handleViewAllCategories = () => {
    navigate("/menu", {
      state: {
        categoryIds: [],
        activeCategoryId: null,
        activeCategoryName: null,
      },
    });
  };

  // CategorySidebar(mode="home") sẽ gọi onCategoryClick(parent, null, children)
  const handleCategoryClick = (category, _parent, children = []) => {
    const allIds = [
      category.categoryId,
      ...children.map((c) => c.categoryId),
    ];

    navigate("/menu", {
      state: {
        categoryIds: allIds,              // dùng để lọc ở MenuPage
        activeCategoryId: category.categoryId, // dùng để highlight
      },
    });
  };

  return (
    <div className="main-content">
      <div className="layout-with-sidebar">
        {/* Cột trái: danh mục để dẫn sang Menu */}
        <CategorySidebar
          mode="home"
          onCategoryClick={handleCategoryClick}
          onResetCategory={handleViewAllCategories}
        />

        {/* Cột giữa: nội dung trang chủ */}
        <div className="layout-main">
          <SummerBanner />
          <BigImage />
          <About />
          <NcfRecommendation />
          <RecommendationBar />
          <Team />
        </div>

        {/* Cột phải: banner quảng cáo */}
        <SideBanner />
      </div>
    </div>
  );
};

export default HomePage;