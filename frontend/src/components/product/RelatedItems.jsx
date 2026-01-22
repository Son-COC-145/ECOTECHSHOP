import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/RelatedItems.css';

const RelatedItems = ({ relatedProducts }) => {
  const navigate = useNavigate();

  const getPriceInfo = (product) => {
    if (!product || !product.productPrices) return { price: 0, label: '' };

    const sorted = [...product.productPrices].sort(
      (a, b) => Number(a.optionPrice || 0) - Number(b.optionPrice || 0)
    );

    const first = sorted[0] || {};
    return {
      price: Number(first.optionPrice || 0),
      label: first.optionName || ''
    };
  };

  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="related-items">
      <h3>Sản phẩm liên quan</h3>

      <div className="related-list">
        {relatedProducts.map((product) => {
          const { price, label } = getPriceInfo(product);

          return (
            <div
              key={product.productId}
              className="related-item"
              onClick={() =>
                navigate(
                  `/product/${encodeURIComponent(product.categoryName)}/${product.productId}`
                )
              }
            >
              <img
                src={product.image || product.productImages?.[0]?.imageUrl}
                alt={product.name}
                className="related-image"
                onError={e => {
                  e.target.src = '/placeholder.png';
                  e.target.onerror = null;
                }}
              />

              <h4 className="related-name">{product.name}</h4>

              <p className="related-price">
                {price > 0
                  ? `${price.toLocaleString()} VND${label ? ` / ${label}` : ''}`
                  : 'Liên hệ'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedItems;