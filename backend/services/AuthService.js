const jwt = require('jsonwebtoken');
const UserDAO = require('../dao/UserDAO');
const AuthDAO = require('../dao/AuthDAO');
const { validatePasswordStrength } = require('../utils/passwordValidator');
const { sendOtpEmail } = require('../utils/email');

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES || 10);

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildOtpExpiry() {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + OTP_EXPIRES_MINUTES);
  return expires;
}

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

    const otpCode = generateOtpCode();
    const otpExpires = buildOtpExpiry();

    await UserDAO.create({
      username,
      email: data.email,
      phone,
      password: data.password,
      role: 'customer',
      isEmailVerified: 0,
      emailVerifyCode: otpCode,
      emailVerifyExpires: otpExpires,
    });

    const user = await UserDAO.findByEmail(data.email);

    await sendOtpEmail({
      to: data.email,
      code: otpCode,
      expiresMinutes: OTP_EXPIRES_MINUTES,
    });

    return { user, requiresVerification: true };
  }

  static async login(email, password) {
    const user = await UserDAO.findByEmail(email);
    if (!user) throw new Error('Email không tồn tại');

    if (!user.isEmailVerified) {
      throw new Error('Email chưa được xác thực. Vui lòng kiểm tra hộp thư.');
    }

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

  static async verifyEmailOtp(email, code) {
    const user = await UserDAO.findByEmail(email);
    if (!user) throw new Error('Email không tồn tại');

    if (user.isEmailVerified) {
      return { verified: true };
    }

    if (!user.emailVerifyCode || !user.emailVerifyExpires) {
      throw new Error('Mã xác thực không hợp lệ. Vui lòng gửi lại mã.');
    }

    const now = new Date();
    const expiresAt = new Date(user.emailVerifyExpires);
    if (now > expiresAt) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng gửi lại mã.');
    }

    if (String(code).trim() !== String(user.emailVerifyCode).trim()) {
      throw new Error('Mã xác thực không đúng');
    }

    await UserDAO.markEmailVerified(user.userId);
    return { verified: true };
  }

  static async resendEmailOtp(email) {
    const user = await UserDAO.findByEmail(email);
    if (!user) throw new Error('Email không tồn tại');
    if (user.isEmailVerified) {
      return { alreadyVerified: true };
    }

    const otpCode = generateOtpCode();
    const otpExpires = buildOtpExpiry();
    await UserDAO.setEmailVerification(user.userId, {
      code: otpCode,
      expiresAt: otpExpires,
    });

    await sendOtpEmail({
      to: email,
      code: otpCode,
      expiresMinutes: OTP_EXPIRES_MINUTES,
    });

    return { sent: true };
  }
}

module.exports = AuthService;
