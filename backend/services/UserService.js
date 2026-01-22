const UserDAO = require('../dao/UserDAO');
const User = require('../models/User');

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

    await UserDAO.updatePassword(userId, newPass);
  }

  // Admin methods
  static async getAllUsers({ page = 1, limit = 50 } = {}) {
    const allUsers = await UserDAO.getAll();
    const total = allUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = allUsers.slice(startIndex, endIndex);
    
    return {
      users: paginatedUsers.map(row => new User(row)),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
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
}

module.exports = UserService;
