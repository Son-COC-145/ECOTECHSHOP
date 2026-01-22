// src/services/categoryService.js
import api from "./api";

export const getCategories = async () => {
  const response = await api.get("/api/categories/list");
  return response.data;
};

export const addCategory = async (categoryData) => {
  const response = await api.post("/api/categories", categoryData);
  return response.data;
};

export const updateCategory = async (id, categoryData) => {
  const response = await api.put(`/api/categories/${id}`, categoryData);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/api/categories/${id}`);
  return response.data;
};
