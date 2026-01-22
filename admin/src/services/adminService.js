// src/services/adminService.js
import api from "./api";

export const checkAdminRole = async () => {
  const response = await api.get("/api/auth/me");
  return response.data;
};

// ✅ phân trang + filter status
export const getAllOrders = async ({ page = 1, limit = 100, status = "All" } = {}) => {
  const params = { page, limit };
  if (status && status !== "All") params.status = status;

  const response = await api.get("/api/orders", { params });
  return response.data; // { success, orders, total, page, limit, totalPages }
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.patch(`/api/orders/${orderId}/status`, { status });
  return response.data;
};

export const getOrderDetail = async (orderId) => {
  const response = await api.get(`/api/orders/${orderId}`);
  return response.data; // { success, order, items }
};
