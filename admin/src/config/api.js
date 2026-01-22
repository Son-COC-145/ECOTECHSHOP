// API configuration for admin
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      ME: '/api/auth/me'
    },
    PRODUCTS: {
      LIST: '/api/products',
      CREATE: '/api/products',
      UPDATE: '/api/products',
      DELETE: '/api/products'
    },
    ORDERS: {
      LIST: '/api/orders',
      UPDATE: '/api/orders',
      STATS: '/api/orders/stats'
    },
    USERS: {
      LIST: '/api/users',
      STATS: '/api/users/stats'
    },
    CATEGORIES: {
      LIST: '/api/categories',
      CREATE: '/api/categories',
      UPDATE: '/api/categories',
      DELETE: '/api/categories'
    }
  }
};

export default API_CONFIG;
