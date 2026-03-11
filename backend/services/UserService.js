const UserDAO = require('../dao/UserDAO');
const User = require('../models/User');
const { validatePasswordStrength } = require('../utils/passwordValidator');

class UserService {
  static async getProfile(id) {
    const row = await UserDAO.findById(id);
    if (!row) return null;
    return new User(row);
  }

  static async changePassword(userId, oldPass, newPass) {
    const row = await UserDAO.findById(userId);
    if (!row) throw new Error('Không tìm thấy user');

    const bcrypt = require('bcryptjs');
    const ok = await bcrypt.compare(oldPass, row.password);
    if (!ok) throw new Error('Mật khẩu cũ không đúng');

    // Kiểm tra độ mạnh mật khẩu mới
    const passwordCheck = validatePasswordStrength(newPass);
    if (!passwordCheck.isValid) {
      throw new Error(passwordCheck.message);
    }

    await UserDAO.updatePassword(userId, newPass);
  }

  // Admin methods
  static async getAllUsers({ page = 1, limit = 50, searchTerm = '', role = '', sortBy = 'createdAt', sortOrder = 'DESC', statusFilter = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;

    const allUsers = await UserDAO.getUsers({ searchTerm, role, sortBy, sortOrder, statusFilter });

    const total = allUsers.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    return {
      users: paginatedUsers.map(row => new User(row)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }

  static async deleteUser(userId) {
    const user = await UserDAO.findById(userId);
    if (!user) throw new Error('Không tìm thấy người dùng');
    await UserDAO.deleteUser(userId);
  }

  static async restoreUser(userId) {
    const pool = require('../config/db').getPool();
    const [rows] = await pool.execute('SELECT * FROM Users WHERE userId = ?', [userId]);
    if (!rows[0]) throw new Error('Không tìm thấy người dùng');
    await UserDAO.restoreUser(userId);
  }

  static async getUserById(userId) {
    const row = await UserDAO.findById(userId);
    if (!row) return null;
    return new User(row);
  }

  static async updateUser(userId, data) {
    await UserDAO.update(userId, data);
    return await this.getUserById(userId);
  }

  static async updateProfile(userId, data) {
    const { username, phone } = data;

    // Validate
    if (username && username.trim().length < 2) {
      throw new Error('Tên phải có ít nhất 2 ký tự');
    }

    if (phone) {
      const normalizedPhone = String(phone).replace(/\D/g, '');
      if (!/^0\d{9}$/.test(normalizedPhone)) {
        throw new Error('Số điện thoại không hợp lệ (phải 10 số, bắt đầu bằng 0)');
      }
      data.phone = normalizedPhone;
    }

    await UserDAO.updateProfile(userId, data);
    return await UserService.getProfile(userId);
  }
}

module.exports = UserService;
