import React, { useEffect, useState } from "react";
import { apiConfig } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../styles/RecommendationBar.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export default function RecommendationBar() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [recommendedIds, setRecommendedIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Early return check - không render gì nếu không có điều kiện cần thiết
  const isValidUser = 
    !authLoading &&
    user &&
    !user.isGuest &&
    user.token &&
    (user.userId || user.id);

  const userId = user?.userId || user?.id;
  const userIdNum = userId ? Number(userId) : null;
  const hasValidUserId = userIdNum && !isNaN(userIdNum) && userIdNum > 0;

  // 1) Lấy danh sách gợi ý theo userId - chỉ chạy khi có user hợp lệ
  useEffect(() => {
    // Early return nếu không có user hợp lệ
    if (!isValidUser || !hasValidUserId) {
      setRecommendedIds([]);
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Chỉ đến đây nếu có userId hợp lệ - bắt đầu fetch
    let abortController = new AbortController();

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        const res = await fetch(
          `${BASE_URL}/api/recommend/user/${userIdNum}`,
          { signal: abortController.signal }
        );

        clearTimeout(timeoutId);

        if (abortController.signal.aborted) {
          return;
        }

        if (!res.ok) {
          setError(null);
          setLoading(false);
          setRecommendedIds([]);
          setProducts([]);
          return;
        }

        const data = await res.json();
        
        if (!data.success) {
          setError(null);
          setLoading(false);
          setRecommendedIds([]);
          setProducts([]);
          return;
        }

        setRecommendedIds(data.recommendations || []);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        
        console.error("Lỗi lấy recommendation:", err);
        setError(null);
        setRecommendedIds([]);
        setProducts([]);
        setLoading(false);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      abortController.abort();
    };
  }, [isValidUser, hasValidUserId, userIdNum, user?.userId, user?.id, user?.token, user?.isGuest, authLoading]);

  // 2) Lấy chi tiết sản phẩm theo productId
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
        // Log error nhưng không set error để component không hiển thị
        console.error("Lỗi load chi tiết sản phẩm:", err);
        // Không set error - component sẽ không hiển thị nếu không có products
      }
    };

    fetchProducts();
  }, [recommendedIds]);

  // Kiểm tra điều kiện hiển thị: Chỉ hiển thị khi có userId hợp lệ và có products
  if (!isValidUser || !hasValidUserId || loading || error || products.length === 0) {
    return null;
  }

  return (
    <div className="recom-wrapper">
      <div className="recom-container">
        <h3 className="recom-title">Sản phẩm được người khác tin dùng</h3>

        <div className="recom-scroll">
          {products.map((p) => (
            <div
              key={p.productId}
              className="recom-item"
              onClick={() =>
                navigate(`/product/${p.categoryName}/${p.productId}`)
              }
            >
              <img
                src={p.image || p.productImages?.[0]?.imageUrl}
                alt={p.name}
                className="recom-img"
                onError={(e) => {
                  e.target.src = "/placeholder.png";
                  e.target.onerror = null;
                }}
              />

              <p className="recom-name">{p.name}</p>

              <p className="recom-price">
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