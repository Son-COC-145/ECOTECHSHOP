import axios from 'axios';
import { apiConfig } from '../config/api';
 
const API_URL = `${apiConfig.baseURL}/api/address`;

const addressApi = {
  // ================================
  // 🔹 Lấy danh sách địa chỉ
  // ================================
  getAddresses: async (token) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token không tồn tại hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    }

    try {
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend trả về: { success: true, addresses: [...] }
      return response.data.addresses || [];
    } catch (error) {
      console.error(
        '❌ Lỗi từ server khi lấy địa chỉ:',
        error.response?.status,
        error.response?.data || error.message
      );

      if (error.response?.status === 404) return [];

      throw new Error(error.response?.data?.message || 'Không thể tải danh sách địa chỉ');
    }
  },

  // ================================
  // 🔹 Thêm địa chỉ mới
  // ================================
  addAddress: async (address, token) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token không tồn tại hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    }

    try {
      const response = await axios.post(API_URL, address, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // backend trả: { success: true, address: {...} }
      return response.data.address;
    } catch (error) {
      console.error('❌ Lỗi từ server khi thêm địa chỉ:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Không thể thêm địa chỉ');
    }
  },

  // ================================
  // 🔹 Cập nhật địa chỉ
  // ================================
  updateAddress: async (id, updatedAddress, token) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token không tồn tại hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    }

    try {
      const response = await axios.put(`${API_URL}/${id}`, updatedAddress, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // backend trả: { success: true, message: "..." }
      return response.data;
    } catch (error) {
      console.error('❌ Lỗi server khi cập nhật địa chỉ:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật địa chỉ');
    }
  },

  // ================================
  // 🔹 Xóa địa chỉ
  // ================================
  deleteAddress: async (id, token) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token không tồn tại hoặc không hợp lệ. Vui lòng đăng nhập lại.');
    }

    try {
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Kết quả xóa địa chỉ:', response.status, response.data);
      return { success: true };
    } catch (error) {
      console.error(
        '❌ Lỗi từ server khi xóa địa chỉ:',
        error.response?.status,
        error.response?.data || error.message
      );
      throw new Error(error.response?.data?.message || 'Không thể xóa địa chỉ');
    }
  },
};

export default addressApi;
