import axios from 'axios';
import { apiConfig } from '../config/api';

// Fetch product details by ID
export async function getProductById(productId) {
  try {
    const response = await axios.get(`${apiConfig.baseURL}/api/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
}

// Fetch multiple products by IDs
export async function getProductsByIds(productIds) {
  try {
    const promises = productIds.map(id => getProductById(id));
    const products = await Promise.all(promises);
    return products;
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    throw error;
  }
}
