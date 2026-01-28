// utils/passwordValidator.js

/**
 * Kiểm tra độ mạnh của mật khẩu
 * @param {string} password - Mật khẩu cần kiểm tra
 * @returns {Object} { isValid: boolean, message: string, strength: string }
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Mật khẩu không hợp lệ',
      strength: 'weak'
    };
  }

  // Tối thiểu 6 ký tự
  if (password.length < 6) {
    return {
      isValid: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
      strength: 'weak'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Yêu cầu đủ cả 3 yếu tố: chữ hoa, chữ thường, số
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    const missing = [];
    if (!hasUpperCase) missing.push('chữ hoa (A-Z)');
    if (!hasLowerCase) missing.push('chữ thường (a-z)');
    if (!hasNumber) missing.push('số (0-9)');

    return {
      isValid: false,
      message: `Mật khẩu phải có đủ: chữ hoa, chữ thường và số. Thiếu: ${missing.join(', ')}`,
      strength: 'weak'
    };
  }

  // Mật khẩu đạt yêu cầu tối thiểu
  if (password.length >= 6 && password.length < 8) {
    return {
      isValid: true,
      message: 'Mật khẩu đạt yêu cầu',
      strength: 'medium'
    };
  }

  // Mật khẩu mạnh (từ 8 ký tự trở lên)
  if (password.length >= 8) {
    return {
      isValid: true,
      message: 'Mật khẩu mạnh',
      strength: 'strong'
    };
  }

  return {
    isValid: true,
    message: 'Mật khẩu hợp lệ',
    strength: 'medium'
  };
}

/**
 * Kiểm tra mật khẩu yếu (cho user cũ)
 * @param {string} password - Mật khẩu cần kiểm tra
 * @returns {boolean} true nếu mật khẩu yếu
 */
function isWeakPassword(password) {
  const result = validatePasswordStrength(password);
  return !result.isValid || result.strength === 'weak';
}

module.exports = {
  validatePasswordStrength,
  isWeakPassword
};
