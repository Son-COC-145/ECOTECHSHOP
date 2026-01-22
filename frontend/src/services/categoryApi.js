import axios from "axios";
import { apiConfig } from "../config/api";

const CATEGORY_URL = `${apiConfig.baseURL}/api/categories`;

export const fetchCategories = async () => {
  const res = await axios.get(CATEGORY_URL);
  return res.data.categories || [];
};

export const createCategory = async (data, token) => {
  const res = await axios.post(CATEGORY_URL, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateCategory = async (id, data, token) => {
  const res = await axios.put(`${CATEGORY_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteCategory = async (id, token) => {
  const res = await axios.delete(`${CATEGORY_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
