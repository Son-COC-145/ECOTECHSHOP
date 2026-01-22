// src/services/attributeService.js
import api from "./api";

export const getAttributes = async () => {
  const response = await api.get("/api/attributes");
  return response.data;
};

export const getAttributeById = async (id) => {
  const response = await api.get(`/api/attributes/${id}`);
  return response.data;
};

export const addAttribute = async (attributeData) => {
  const response = await api.post("/api/attributes", attributeData);
  return response.data;
};

export const updateAttribute = async (id, attributeData) => {
  const response = await api.put(`/api/attributes/${id}`, attributeData);
  return response.data;
};

export const deleteAttribute = async (id) => {
  const response = await api.delete(`/api/attributes/${id}`);
  return response.data;
};
