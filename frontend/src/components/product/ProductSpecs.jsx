import React, { useEffect, useState } from "react";
import { apiConfig } from "../../config/api";
import "../../styles/ProductSpecs.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

function ProductSpecs({ productId }) {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const fetchSpecs = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${BASE_URL}/api/product-attribute-values/product/${productId}`
        );

        if (!res.ok) {
          throw new Error("Không thể tải thông số sản phẩm");
        }

        const data = await res.json();

        if (data.success) {
          setSpecs(data.values || []);
        } else {
          setSpecs([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecs();
  }, [productId]);

  return (
    <section className="specs-container">
      <h2 className="specs-title">Thông số kỹ thuật</h2>

      {loading && <p className="specs-loading">Đang tải...</p>}
      {error && <p className="specs-error">{error}</p>}
      {!loading && !error && specs.length === 0 && (
        <p className="specs-empty">Sản phẩm chưa có thông số kỹ thuật.</p>
      )}

      {specs.length > 0 && (
        <div className="specs-table">
          {specs.map((item) => (
            <div className="specs-row" key={item.pavId}>
              <div className="specs-name">{item.attributeName}</div>
              <div className="specs-value">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSpecs;
