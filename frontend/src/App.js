// src/App.jsx
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ChatBot from "./components/layout/ChatBot";
import CartSidebar from "./components/cart/CartSidebar";

import Payment from "./components/cart/Payment";
import PaymentSuccess from "./components/cart/PaymentSuccess";
import PaymentFailure from "./components/cart/PaymentFailure";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// PAGES
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import MenuPage from "./pages/MenuPage";
import ProfilePage from "./pages/ProfilePage";
import OrderHistoryPage from "./pages/OrderHistoryPage";

import "./styles/team.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Đang tải...</div>;
  if (!user) return <Navigate to="/sign-in" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        {/* HEADER LUÔN Ở TRÊN MỌI TRANG */}
        <Header />

        <div className="app-wrapper">
          <Routes>
            {/* HOME */}
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />

            {/* AUTH */}
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />

            {/* PRODUCT DETAIL */}
            <Route
              path="/product/:category/:id"
              element={<ProductDetailPage />}
            />

            {/* CART */}
            <Route path="/cart" element={<CartPage />} />

            {/* PAYMENT */}
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />

            {/* SEARCH */}
            <Route path="/search" element={<SearchResultsPage />} />

            {/* PROFILE – cần đăng nhập */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* CHATBOT + CART SIDEBAR + FOOTER CHUNG CHO TẤT CẢ TRANG */}
        <CartSidebar />
        <ChatBot />
        <Footer />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
