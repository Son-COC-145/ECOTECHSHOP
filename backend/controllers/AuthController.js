const AuthService = require('../services/AuthService');

class AuthController {
  static async register(req, res) {
    try {
      const { user, accessToken } = await AuthService.register(req.body);
      res.status(201).json({ success: true, user, token: accessToken });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async login(req, res) {
    try {
      const { user, accessToken } = await AuthService.login(
        req.body.email, 
        req.body.password
      );
      res.json({ success: true, user, token: accessToken });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMe(req, res) {
    res.json(req.user);
  }
}

module.exports = AuthController;
