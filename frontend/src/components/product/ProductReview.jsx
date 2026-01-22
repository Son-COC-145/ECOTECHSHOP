import React, { useEffect, useState, useMemo } from "react";
import { apiConfig } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/ProductReview.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export default function ProductReview({ productId }) {
  const { user, token } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userReviewLoading, setUserReviewLoading] = useState(false);

  // filter + load more
  const [selectedStar, setSelectedStar] = useState("all");
  const [visibleCount, setVisibleCount] = useState(5);

  const loadReviews = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/reviews/product/${productId}`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error("Lỗi load review:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserReview = async () => {
    if (!user || !token) {
      setUserReviewLoading(false);
      return;
    }

    try {
      setUserReviewLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/reviews/user/product/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setUserReview(data.review || null);
      } else {
        // 404 hoặc không có review
        setUserReview(null);
      }
    } catch (err) {
      console.error("Lỗi load review của user:", err);
      setUserReview(null);
    } finally {
      setUserReviewLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    loadUserReview();
  }, [productId, user, token]);

  const filteredReviews = useMemo(() => {
    if (selectedStar === "all") return reviews;
    return reviews.filter((r) => Number(r.rating) === Number(selectedStar));
  }, [selectedStar, reviews]);

  const renderReviews = filteredReviews.slice(0, visibleCount);

  const handleFilterChange = (star) => {
    setSelectedStar(star);
    setVisibleCount(5);
  };

  return (
    <div className="review-container">
      <h3>Đánh giá sản phẩm</h3>

      {/* Hiển thị review của user nếu có */}
      {user && (
        <div className="user-review-section">
          {userReviewLoading ? (
            <p>Đang tải đánh giá của bạn...</p>
          ) : userReview ? (
            <div className="user-review-display">
              <h4>Đánh giá của bạn</h4>
              <div className="review-item user-review-item">
                <div className="review-header">
                  <strong>{userReview.username || user.name || "Bạn"}</strong>
                  <span className="stars">⭐ {userReview.rating}/5</span>
                </div>
                <p>{userReview.comment}</p>
                <small>
                  {new Date(userReview.createdAt).toLocaleString()}
                </small>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Filter */}
      <div className="review-filter">
        {["all", 5, 4, 3, 2, 1].map((s) => (
          <button
            key={s}
            className={`filter-btn ${selectedStar === s ? "active" : ""}`}
            onClick={() => handleFilterChange(s)}
          >
            {s === "all" ? "Tất cả" : `${s} sao`}
          </button>
        ))}
      </div>

      <hr />

      {/* Danh sách review */}
      {loading ? (
        <p>Đang tải đánh giá...</p>
      ) : filteredReviews.length === 0 ? (
        <p className="review-empty">Không có đánh giá phù hợp.</p>
      ) : (
        <>
          <div className="review-list">
            {renderReviews.map((r) => (
              <div key={r.reviewId} className="review-item">
                <div className="review-header">
                  <strong>{r.username}</strong>
                  <span className="stars">⭐ {r.rating}/5</span>
                </div>
                <p>{r.comment}</p>
                <small>{new Date(r.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>

          {filteredReviews.length > 5 && (
            <div className="review-more dual-buttons">
              {visibleCount < filteredReviews.length && (
                <button onClick={() => setVisibleCount(visibleCount + 5)}>
                  Xem thêm
                </button>
              )}

              {visibleCount > 5 && (
                <button
                  className="collapse-btn"
                  onClick={() => setVisibleCount(5)}
                >
                  Ẩn bớt
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}