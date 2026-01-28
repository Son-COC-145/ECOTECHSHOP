const jwt = require('jsonwebtoken');
const UserDAO = require('../dao/UserDAO');
const AuthDAO = require('../dao/AuthDAO');
const { validatePasswordStrength } = require('../utils/passwordValidator');

class AuthService {
  static async register(data) {
    const exist = await UserDAO.findByEmail(data.email);
    if (exist) throw new Error('Email đã tồn tại');

    // Kiểm tra độ mạnh mật khẩu cho tài khoản mới
    const passwordCheck = validatePasswordStrength(data.password);
    if (!passwordCheck.isValid) {
      throw new Error(passwordCheck.message);
    }

    const username = data.username ?? data.name ?? null;
    const phone = data.phone ?? null;

    await UserDAO.create({
      username,
      email: data.email,
      phone,
      password: data.password,
      role: 'customer',
    });

    const user = await UserDAO.findByEmail(data.email);

    const accessToken = jwt.sign(
      { id: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { user, accessToken };
  }

  static async login(email, password) {
    const user = await UserDAO.findByEmail(email);
    if (!user) throw new Error('Email không tồn tại');

    const bcrypt = require('bcryptjs');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('Sai mật khẩu');

    const accessToken = jwt.sign(
      { id: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { user, accessToken };
  }
}

module.exports = AuthService;
