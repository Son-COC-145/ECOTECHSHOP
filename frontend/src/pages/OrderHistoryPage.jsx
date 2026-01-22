import React from "react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import CartSidebar from "../components/cart/CartSidebar";
import OrderHistory from "../components/product/OrderHistory";

const OrderHistoryPage = () => {
  return (
    <>
     
      <CartSidebar />

      <div className="page-container">
        <OrderHistory />
      </div>

 
    </>
  );
};

export default OrderHistoryPage;
