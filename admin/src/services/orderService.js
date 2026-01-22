// src/services/orderService.js
import api from "./api";

export const getOrders = async () => {
  const response = await api.get("/api/orders/me");
  return response.data;
};

export const getRevenue = async (params) => {
  const response = await api.get("/api/orders/revenue", { params });
  return response.data;
};
