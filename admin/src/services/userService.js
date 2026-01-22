// src/services/userService.js
import api from "./api";

export const getAllUsers = async ({ page = 1, limit = 50 } = {}) => {
  const response = await api.get("/api/users", { params: { page, limit } });
  return response.data; // { users, total, page, limit, totalPages }
};

export const getUserById = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await api.patch(`/api/users/${userId}`, data);
  return response.data;
};

