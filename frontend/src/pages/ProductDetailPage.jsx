import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import CartSidebar from "../components/cart/CartSidebar";

import ProductItem from "../components/product/ProductItem";
import RelatedItems from "../components/product/RelatedItems";
import ProductReview from "../components/product/ProductReview";
import ProductSpecs from "../components/product/ProductSpecs";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { apiConfig } from "../config/api";

import "./../styles/ProductDetail.css";

const BASE_URL =
  apiConfig?.baseURL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BASE_URL}/api/products/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const p = data.product || data;

      setProduct({
        ...p,
        productId: p.productId,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        productPrices: p.productPrices || [],
        productImages: p.productImages || [],
      });
    } catch (err) {
      console.error("❌ Error fetching product:", err);
      setError("Không thể tải thông tin sản phẩm.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRelatedProducts = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`${BASE_URL}/api/products/${id}/related`);
      if (!response.ok) return;

      const data = await response.json();
      setRelatedProducts(data.related || data);
    } catch (err) {
      console.error("❌ Error fetching related products:", err);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    fetchRelatedProducts();
  }, [fetchRelatedProducts]);

  if (loading) {
    return (
      <div className="product-detail">
        <Header />
        <div className="product-content">
          <div>Đang tải sản phẩm...</div>
        </div>
        <Footer />
        <CartSidebar />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail">
        <Header />
        <div className="product-content">
          <div>{error || "Không tìm thấy sản phẩm."}</div>
        </div>
        <Footer />
        <CartSidebar />
      </div>
    );
  }

  return (
    <div className="product-detail">
      <Header />

      <div className="product-content">
        {/* Khối sản phẩm chính */}
        <ProductItem
          product={product}
          addToCart={addToCart}
          selectedAddress={selectedAddress}
          categoryName={product.categoryName}
        />

        {/* Review + Specs 2 cột */}
        <div className="product-detail-bottom">
          <section className="product-detail-review">
            <ProductReview productId={product.productId} />
          </section>

          <aside className="product-detail-specs">
            <ProductSpecs productId={product.productId} />
          </aside>
        </div>

        {/* Sản phẩm liên quan */}
        <RelatedItems relatedProducts={relatedProducts} />
      </div>

      <CartSidebar />
    </div>
  );
};

export default ProductDetail;