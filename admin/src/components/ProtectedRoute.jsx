// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Đang tải...</div>;

  if (!user) {
    return <Navigate to="/signin" />;
  }

  if (adminOnly && user.role !== "admin") {
    alert("Bạn không có quyền truy cập vào trang này!");
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;