import axios from 'axios';
import { apiConfig } from '../config/api';

const API_URL = `${apiConfig.baseURL}/api/products`;
const CATEGORY_URL = `${apiConfig.baseURL}/api/categories`;

export const fetchCategories = async () => {
  const res = await axios.get(CATEGORY_URL);
  return res.data.categories || [];
};

export const fetchMenuItems = async (categoryId) => {
  const res = await axios.get(`${API_URL}/by-category/${categoryId}`);
  return res.data.products || [];
};
