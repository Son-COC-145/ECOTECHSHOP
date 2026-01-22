// src/components/NcfRecommendation.jsx
import React, { useEffect, useState } from "react";
import { apiConfig } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../styles/NcfRecommendation.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export default function NcfRecommendation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recommendedIds, setRecommendedIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1) Lấy danh sách gợi ý NCF theo userId
  useEffect(() => {
    if (!user) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const res = await fetch(
          `${BASE_URL}/api/recommend/ncf/${user.userId}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.message || "Failed to get recommendations");
        }

        setRecommendedIds(data.recommendations || []);
      } catch (err) {
        console.error("Lỗi lấy NCF recommendation:", err);
        
        if (err.name === 'AbortError') {
          setError("Request timeout. Vui lòng thử lại sau.");
        } else {
          setError(err.message || "Không thể tải gợi ý sản phẩm. Vui lòng thử lại sau.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  // 2) Lấy chi tiết sản phẩm
  useEffect(() => {
    if (recommendedIds.length === 0) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        const list = [];
        const errors = [];

        // Fetch song song với giới hạn
        const fetchPromises = recommendedIds.slice(0, 10).map(async (item) => {
          try {
            const res = await fetch(`${BASE_URL}/api/products/${item.productId}`);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            return data.product || data;
          } catch (err) {
            errors.push(item.productId);
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);
        const validProducts = results.filter(p => p !== null);
        
        setProducts(validProducts);

        if (errors.length > 0) {
          console.warn(`⚠️ Failed to load ${errors.length} products`);
        }

        if (validProducts.length === 0 && recommendedIds.length > 0) {
          console.warn("⚠️ No valid products loaded from recommendations");
        }
      } catch (err) {
        console.error("Lỗi load chi tiết sản phẩm:", err);
        setError("Không thể tải thông tin sản phẩm.");
      }
    };

    fetchProducts();
  }, [recommendedIds]);

  // Debug: Log state để kiểm tra (có thể xóa sau)
  useEffect(() => {
    console.log("NCF Debug:", { 
      hasUser: !!user, 
      loading, 
      error, 
      recommendedIdsCount: recommendedIds.length, 
      productsCount: products.length 
    });
  }, [user, loading, error, recommendedIds.length, products.length]);

  // Không hiển thị nếu không có user
  if (!user) return null;

  // Hiển thị loading
  if (loading) {
    return (
      <div className="ncf-wrapper">
        <div className="ncf-container">
          <h3 className="ncf-title">✨ Sản phẩm có thể bạn thích</h3>
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
            Đang tải gợi ý...
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị error
  if (error) {
    return (
      <div className="ncf-wrapper">
        <div className="ncf-container">
          <h3 className="ncf-title">✨ Sản phẩm có thể bạn thích</h3>
          <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
            <p>{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                setRecommendedIds([]);
                setProducts([]);
                // Trigger re-fetch
                window.location.reload();
              }} 
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu đã load xong (không loading, không error) nhưng không có sản phẩm
  // Có thể do: API trả về recommendations rỗng hoặc không load được products
  if (!loading && !error && products.length === 0) {
    // Nếu có recommendedIds nhưng không có products → có thể là lỗi load products
    if (recommendedIds.length > 0) {
      return (
        <div className="ncf-wrapper">
          <div className="ncf-container">
            <h3 className="ncf-title">✨ Sản phẩm có thể bạn thích</h3>
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
              <p>Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.</p>
            </div>
          </div>
        </div>
      );
    }
    // Nếu không có recommendedIds → API trả về rỗng hoặc user không có trong mapping
    return null;
  }

  // Hiển thị sản phẩm (chỉ đến đây nếu có products)
  return (
    <div className="ncf-wrapper">
      <div className="ncf-container">
        <h3 className="ncf-title">✨ Sản phẩm có thể bạn thích</h3>

        <div className="ncf-scroll">
          {products.map((p) => (
            <div
              key={p.productId}
              className="ncf-item"
              onClick={() =>
                navigate(`/product/${p.categoryName}/${p.productId}`)
              }
            >
              <img
                src={p.image || p.productImages?.[0]?.imageUrl}
                alt={p.name}
                className="ncf-img"
                onError={(e) => {
                  e.target.src = "/placeholder.png";
                  e.target.onerror = null;
                }}
              />

              <p className="ncf-name">{p.name}</p>

              <p className="ncf-price">
                {p.productPrices?.[0]
                  ? `${p.productPrices[0].optionPrice.toLocaleString()} VND`
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}