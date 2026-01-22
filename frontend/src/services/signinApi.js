import axios from "axios";
import { apiConfig } from "../config/api";

const API_URL = `${apiConfig.baseURL}/api/auth/login`;

export const signIn = async (email, password) => {
  try {
    const res = await axios.post(API_URL, { email, password });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Đăng nhập thất bại");
  }
};
