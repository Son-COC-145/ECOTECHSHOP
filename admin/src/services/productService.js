// src/services/productService.js
import api from "./api";

export const getProducts = async (includeDeleted = true) => {
  const response = await api.get(`/api/products?includeDeleted=${includeDeleted}`);
  return response.data;
};

export const addProduct = async (productData) => {
  const response = await api.post("/api/products", productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await api.put(`/api/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/api/products/${id}`);
  return response.data;
};

export const restoreProduct = async (id) => {
  const response = await api.post(`/api/products/${id}/restore`);
  return response.data;
};

export const updateProductStatus = async (id, status) => {
  const response = await api.patch(`/api/products/${id}/status`, { status });
  return response.data;
};