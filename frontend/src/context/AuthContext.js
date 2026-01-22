// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { apiConfig } from "../config/api";
import { signIn } from "../services/signinApi";
import { registerUser } from "../services/signupApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem("token");
    const token = storedToken && typeof storedToken === "string" ? storedToken.trim() : storedToken;
    const tempUserId = localStorage.getItem("tempUserId");

    const initializeUser = async () => {
      // Có token => thử gọi /api/auth/me
      if (token) {
        try {
          const response = await axios.get(`${apiConfig.baseURL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!isMounted) return;

          const data = response.data || {};

          // req.user từ backend: { userId, username, email, phone, role, ..., id }
          setUser({
            id: data.id || data.userId,
            userId: data.userId || data.id,
            username: data.username,
            email: data.email,
            phone: data.phone,
            role: data.role,
            token,
            isGuest: false,
          });

          setLoading(false);
        } catch (error) {
          console.error("Lỗi khi lấy thông tin user /auth/me:", error.response?.data || error.message);
          if (!isMounted) return;

          // Token lỗi => xoá và fallback sang guest
          localStorage.removeItem("token");
          const guestId = tempUserId || `guest-${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem("tempUserId", guestId);
          setUser({ _id: guestId, isGuest: true });
          navigate("/sign-in");
          setLoading(false);
        }
      } else if (tempUserId) {
        // Không có token nhưng có tempUserId => guest cũ
        if (!isMounted) return;
        setUser({ _id: tempUserId, isGuest: true });
        setLoading(false);
      } else {
        // Guest mới
        const guestId = `guest-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("tempUserId", guestId);
        if (!isMounted) return;
        setUser({ _id: guestId, isGuest: true });
        setLoading(false);
      }
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const login = async (email, password) => {
    try {
      if (!email || !password) throw new Error("Vui lòng nhập email và mật khẩu.");

      const response = await signIn(email, password); // POST /api/auth/login
      const rawToken = response.token;
      const userData = response.user;

      if (!rawToken || typeof rawToken !== "string" || !userData) {
        throw new Error("Không nhận được token hoặc dữ liệu user từ server");
      }

      const token = rawToken.trim();

      localStorage.setItem("token", token);
      localStorage.removeItem("tempUserId");

      setUser({
        id: userData.id || userData.userId,
        userId: userData.userId || userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        token,
        isGuest: false,
      });

      navigate("/");
    } catch (error) {
      const errorMessage = error.message || "Email hoặc mật khẩu không đúng";
      throw new Error(errorMessage);
    }
  };

  const register = async (username, email, phone, password) => {
    try {
      if (!username || !email || !phone || !password) {
        throw new Error("Vui lòng nhập đầy đủ thông tin.");
      }

      const response = await registerUser({ username, email, phone, password }); // POST /api/auth/register

      const rawToken = response.token;
      const userData = response.user;

      if (!rawToken || typeof rawToken !== "string" || !userData) {
        throw new Error("Không nhận được token hoặc dữ liệu user từ server");
      }

      const token = rawToken.trim();

      localStorage.setItem("token", token);
      localStorage.removeItem("tempUserId");

      setUser({
        id: userData.id || userData.userId,
        userId: userData.userId || userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        token,
        isGuest: false,
      });

      navigate("/");
    } catch (error) {
      const errorMessage = error.message || "Đăng ký thất bại";
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    const guestId = `guest-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("tempUserId", guestId);
    setUser({ _id: guestId, isGuest: true });
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
