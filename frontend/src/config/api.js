// Cấu hình API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function để tạo axios instance
export const createApiInstance = (baseURL = API_BASE_URL) => {
  const axios = require('axios');
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export default API_BASE_URL;
