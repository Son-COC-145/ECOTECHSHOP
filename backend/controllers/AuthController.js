const AuthService = require('../services/AuthService');

class AuthController {
  static async register(req, res) {
    try {
      const { user, requiresVerification } = await AuthService.register(req.body);
      res.status(201).json({ success: true, user, requiresVerification });
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

  static async verifyEmail(req, res) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Thiếu email hoặc mã xác thực' });
      }

      await AuthService.verifyEmailOtp(email, code);
      res.json({ success: true, verified: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async resendEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Thiếu email' });
      }

      const result = await AuthService.resendEmailOtp(email);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = AuthController;
