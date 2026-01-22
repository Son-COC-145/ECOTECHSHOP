// src/context/AuthContext.js
import { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { login, getMe } from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const userData = await getMe();
          setUser(userData);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra người dùng:", error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const signIn = async (email, password) => {
    try {
      if (!email || !password) throw new Error("Vui lòng nhập email và mật khẩu.");

      const response = await login(email, password); // POST /api/auth/login
      // Xử lý giống customer - lấy trực tiếp token và user từ response
      const rawToken = response.token;
      const userData = response.user;

      if (!rawToken || typeof rawToken !== "string" || !userData) {
        throw new Error("Không nhận được token hoặc dữ liệu user từ server");
      }

      const token = rawToken.trim();

      localStorage.setItem("token", token);

      setUser({
        id: userData.id || userData.userId,
        userId: userData.userId || userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        token,
      });

      // Kiểm tra role (case-insensitive)
      const userRole = (userData.role || "").toLowerCase().trim();
      if (userRole === "admin") {
        navigate("/dashboard");
      } else {
        alert(`Chỉ admin mới có quyền truy cập! Role hiện tại: ${userData.role || "không xác định"}`);
        localStorage.removeItem("token");
        setUser(null);
        throw new Error("Không có quyền admin");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      throw error; // Re-throw để SignIn component có thể hiển thị
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/signin");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};