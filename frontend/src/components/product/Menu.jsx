// src/components/menu/Menu.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import "../../styles/Menu.css";

function Menu({ selectedCategories }) {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [error, setError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const all = await axios.get("http://localhost:5000/api/products");

        const productList =
          all.data.products || all.data || all.data.recordset || [];

        const productsWithPrice = await Promise.all(
          productList.map(async (p) => {
            const priceRes = await axios.get(
              `http://localhost:5000/api/prices?productId=${p.productId}`
            );
            return {
              ...p,
              productPrices: priceRes.data.data || [],
            };
          })
        );

        setAllProducts(productsWithPrice);
        setFilteredItems(productsWithPrice);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu sản phẩm");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const activeIds = Object.keys(selectedCategories)
      .filter((id) => selectedCategories[id])
      .map((id) => Number(id));

    let items = [];
    if (activeIds.length === 0) items = allProducts;
    else {
      items = allProducts.filter((item) =>
        activeIds.includes(item.categoryId)
      );
    }

    setFilteredItems(items);
    setVisibleCount(12);
  }, [selectedCategories, allProducts]);

  useEffect(() => {
    let items = [...filteredItems];

    const getFirstPrice = (p) =>
      Number(p.productPrices?.[0]?.optionPrice || 0);

    if (sortOption === "low-to-high") {
      items.sort((a, b) => getFirstPrice(a) - getFirstPrice(b));
    } else if (sortOption === "high-to-low") {
      items.sort((a, b) => getFirstPrice(b) - getFirstPrice(a));
    } else if (sortOption === "best-seller") {
      items.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    } else if (sortOption === "rating") {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFilteredItems(items);
    setVisibleCount(12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption]);

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
    <section className="menu">
      <div className="menu-main-content">
        <div className="section-title">
          <h2>Sản phẩm của chúng tôi</h2>
        </div>

        <div className="menu-title">
          <h2>Tận hưởng công nghệ hiện đại mỗi ngày</h2>
        </div>

        <div className="menu-products">
          <div className="menu-sort">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="low-to-high">Giá thấp → cao</option>
              <option value="high-to-low">Giá cao → thấp</option>
              <option value="best-seller">Bán chạy</option>
              <option value="rating">Đánh giá</option>
            </select>
          </div>

          {showSuccessMessage && (
            <div className="success-message">Đã thêm vào giỏ hàng!</div>
          )}
          {error && <p className="error-message">{error}</p>}

          <div className="menu-lists">
            {loadingProducts ? (
              <div className="loading-container">
                <p>Đang tải...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="no-products">
                <p>Không có sản phẩm nào</p>
              </div>
            ) : (
              filteredItems.slice(0, visibleCount).map((item) => {
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
                            item.categoryName
                          )}/${item.productId}`
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

          {filteredItems.length > 12 && (
            <div className="menu-load-more">
              {visibleCount < filteredItems.length && (
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleCount(visibleCount + 12)}
                >
                  Xem thêm
                </button>
              )}
              {visibleCount > 12 && (
                <button
                  className="collapse-btn"
                  onClick={() => setVisibleCount(12)}
                >
                  Ẩn bớt
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Menu;
