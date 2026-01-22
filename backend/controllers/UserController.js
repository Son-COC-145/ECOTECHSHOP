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
      const { page = 1, limit = 50 } = req.query;
      const result = await UserService.getAllUsers({ page, limit });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
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
}

module.exports = UserController;
