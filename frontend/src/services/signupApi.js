import axios from "axios";
import { apiConfig } from "../config/api";

const API_URL = `${apiConfig.baseURL}/api/auth/register`;
const VERIFY_URL = `${apiConfig.baseURL}/api/auth/verify-email`;
const RESEND_URL = `${apiConfig.baseURL}/api/auth/resend-otp`;

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

export const verifyEmailOtp = async ({ email, code }) => {
  try {
    const res = await axios.post(VERIFY_URL, { email, code });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Xác thực email thất bại");
  }
};

export const resendEmailOtp = async ({ email }) => {
  try {
    const res = await axios.post(RESEND_URL, { email });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Gửi lại mã thất bại");
  }
};
