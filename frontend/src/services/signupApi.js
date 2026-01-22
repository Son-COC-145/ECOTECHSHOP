import axios from "axios";
import { apiConfig } from "../config/api";

const API_URL = `${apiConfig.baseURL}/api/auth/register`;

export const registerUser = async ({ username, email, phone, password }) => {
  try {
    const res = await axios.post(API_URL, {
      username,
      email,
      phone,
      password,
    });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Đăng ký thất bại");
  }
};
