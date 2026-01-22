// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const UserDAO = require('../dao/UserDAO');   // ✔ DÙNG DAO, KHÔNG DÙNG MODEL

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];

    if (!token || typeof token !== "string" || token.trim() === "") {
      return res.status(401).json({ message: "Token không hợp lệ hoặc trống" });
    }

    try {
      // Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Lấy user từ DB qua DAO
      const user = await UserDAO.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "Token không hợp lệ — không tìm thấy user" });
      }

      // Loại bỏ password
      const { password, ...userWithoutPassword } = user;

      req.user = {
        ...userWithoutPassword,
        id: user.userId,      // dùng chuẩn userId
        userId: user.userId,
      };

      return next();

    } catch (error) {
      console.error("Lỗi xác thực token:", error);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token đã hết hạn" });
      }

      return res.status(401).json({ message: "Token không hợp lệ" });
    }
  }

  return res.status(401).json({ message: "Thiếu token" });
};

const restrictTo = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Không có quyền thực hiện hành động này" });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
