const UserService = require('../services/UserService');

class UserController {
  static async getMe(req, res) {
    try {
      const user = await UserService.getProfile(req.user.id);
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      await UserService.changePassword(req.user.id, oldPassword, newPassword);
      res.json({ message: "Đổi mật khẩu thành công" });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async getName(req, res) {
    try {
      const user = await UserService.getProfile(req.params.userId);
      if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
      res.json({ username: user.username || "Ẩn danh" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  // Admin methods
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const searchTerm = req.query.search || '';
      const role = req.query.role || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'DESC';
      const statusFilter = req.query.statusFilter !== undefined ? req.query.statusFilter : '';
      const result = await UserService.getAllUsers({ page, limit, searchTerm, role, sortBy, sortOrder, statusFilter });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async deleteUser(req, res) {
    try {
      await UserService.deleteUser(req.params.userId);
      res.json({ message: 'Xóa người dùng thành công' });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async restoreUser(req, res) {
    try {
      await UserService.restoreUser(req.params.userId);
      res.json({ message: 'Khôi phục người dùng thành công' });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async getUserById(req, res) {
    try {
      const user = await UserService.getUserById(req.params.userId);
      if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

  static async updateUser(req, res) {
    try {
      const { username, email, phone, role } = req.body;
      const user = await UserService.updateUser(req.params.userId, { username, email, phone, role });
      res.json({ message: "Cập nhật thành công", user });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username, phone } = req.body;

      if (!username && !phone) {
        return res.status(400).json({ message: 'Vui lòng cung cấp thông tin cần cập nhật' });
      }

      const updatedUser = await UserService.updateProfile(userId, { username, phone });
      res.json({ 
        success: true, 
        message: 'Cập nhật thông tin thành công',
        user: updatedUser 
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
}

module.exports = UserController;
