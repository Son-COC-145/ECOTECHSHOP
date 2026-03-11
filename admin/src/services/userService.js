// src/services/userService.js
import api from "./api";

export const getAllUsers = async ({ page = 1, limit = 50, search = '', role = '', sortBy = 'createdAt', sortOrder = 'DESC', statusFilter = 'active' } = {}) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (role) params.role = role;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  params.statusFilter = statusFilter; // always send, even empty string
  const response = await api.get("/api/users", { params });
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
};

export const restoreUser = async (userId) => {
  const response = await api.patch(`/api/users/${userId}/restore`);
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await api.patch(`/api/users/${userId}`, data);
  return response.data;
};

