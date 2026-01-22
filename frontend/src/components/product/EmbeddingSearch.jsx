import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/search.css";

const EmbeddingSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!keyword.trim()) {
      setProducts([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      axios
        .get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/products/search-embedding?keyword=${encodeURIComponent(
            keyword.trim()
          )}`
        )
        .then((res) => {
          // API trả về { success: true, results: [...] }
          const results = res.data.results || [];
          // Chuẩn hóa dữ liệu để UI dùng chung format
          const normalized = results.map((item) => ({
            _id: item.id,
            name: item.name,
            image: item.image,
            prices: item.prices,
            categoryName: item.category,
            score: item.score
          }));
          setProducts(normalized);
          setShowDropdown(true);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Lỗi tìm kiếm embedding:", err);
          setProducts([]);
          setShowDropdown(false);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="search-wrapper" ref={boxRef}>
      <input
        type="text"
        placeholder="🔍 Tìm sản phẩm theo embedding..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="search-input"
      />
      {loading && <div className="loading">Đang tìm kiếm...</div>}

      {showDropdown && (
        <ul className="search-dropdown">
          {products.length > 0 ? (
            products.map((product) => (
              <li
                key={product._id}
                className="search-item"
                onClick={() => {
                  navigate(`/${product.categoryName || "category"}/${product._id}`);
                  setShowDropdown(false);
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="search-item-img"
                  loading="lazy"
                />
                <div className="search-item-info">
                  <span className="name">{product.name}</span>
                  <span className="category">{product.categoryName}</span>
                </div>
                <div className="search-item-price">
                  <span className="price">
                    {product.prices?.["250"]
                      ? `${product.prices["250"].toLocaleString()}₫`
                      : "N/A"}
                  </span>
                  {product.score && (
                    <span className="score">{(product.score * 100).toFixed(1)}%</span>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="search-item not-found">Không tìm thấy sản phẩm</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default EmbeddingSearch;
