const { getPool } = require('../config/db');
const bcrypt = require('bcryptjs');

class UserDAO {
  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM Users');
    return rows;
  }

  static async findById(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Users WHERE userId = ?',
      [userId]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async create({ username, email, phone, password, role }) {
    const pool = getPool();
    const hash = await bcrypt.hash(password, 10);

    const safeUsername = username ?? null;
    const safePhone = phone ?? null;

    const [result] = await pool.execute(`
      INSERT INTO Users (username, email, phone, password, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [safeUsername, email, safePhone, hash, role]);

    return result;
  }

  static async updatePassword(userId, newPassword) {
    const pool = getPool();
    const hash = await bcrypt.hash(newPassword, 10);

    const [result] = await pool.execute(`
      UPDATE Users
      SET password = ?, updatedAt = NOW()
      WHERE userId = ?
    `, [hash, userId]);

    return result;
  }

  static async update(userId, { username, email, phone, role }) {
    const pool = getPool();
    const setParts = [];
    const values = [];

    if (username !== undefined) {
      setParts.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      setParts.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      setParts.push('phone = ?');
      values.push(phone);
    }
    if (role !== undefined) {
      setParts.push('role = ?');
      values.push(role);
    }

    if (setParts.length === 0) {
      return;
    }

    setParts.push('updatedAt = NOW()');
    values.push(userId);

    const query = `UPDATE Users SET ${setParts.join(', ')} WHERE userId = ?`;
    const [result] = await pool.execute(query, values);
    return result;
  }
}

module.exports = UserDAO;