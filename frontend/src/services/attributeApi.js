import axios from "axios";
import { apiConfig } from "../config/api";

const API_URL = `${apiConfig.baseURL}/api/attributes`;

export const fetchAttributes = async (categoryId = null) => {
  const url = categoryId ? `${API_URL}?categoryId=${categoryId}` : API_URL;
  const res = await axios.get(url);
  return res.data.attributes || res.data;
};

export const createAttribute = async (data, token) => {
  const res = await axios.post(API_URL, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateAttribute = async (id, data, token) => {
  const res = await axios.put(`${API_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteAttribute = async (id, token) => {
  const res = await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
