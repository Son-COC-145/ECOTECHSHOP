const { getPool } = require('../config/db');
const bcrypt = require('bcryptjs');

class UserDAO {
  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM Users WHERE isDeleted = 0 OR isDeleted IS NULL');
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

  static async updateProfile(userId, { username, phone }) {
    const pool = getPool();
    const setParts = [];
    const values = [];

    if (username !== undefined) {
      setParts.push('username = ?');
      values.push(username);
    }
    if (phone !== undefined) {
      setParts.push('phone = ?');
      values.push(phone);
    }

    if (setParts.length === 0) {
      throw new Error('Không có thông tin để cập nhật');
    }

    setParts.push('updatedAt = NOW()');
    values.push(userId);

    const query = `UPDATE Users SET ${setParts.join(', ')} WHERE userId = ?`;
    const [result] = await pool.execute(query, values);
    return result;
  }

  static async getUsers({ searchTerm = '', role = '', sortBy = 'createdAt', sortOrder = 'DESC', statusFilter = 'active' } = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];

    // statusFilter: 'active' = chưa xóa, 'deleted' = đã xóa, '' = tất cả
    if (statusFilter === 'active') {
      conditions.push('(isDeleted = 0 OR isDeleted IS NULL)');
    } else if (statusFilter === 'deleted') {
      conditions.push('isDeleted = 1');
    }

    if (searchTerm) {
      conditions.push('(email LIKE ? OR username LIKE ? OR CAST(userId AS CHAR) LIKE ?)');
      const pattern = `%${searchTerm}%`;
      values.push(pattern, pattern, pattern);
    }

    if (role) {
      conditions.push('role = ?');
      values.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist to prevent SQL injection
    const allowedSortBy = ['userId', 'email', 'username', 'role', 'createdAt', 'updatedAt'];
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `SELECT * FROM Users ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder}`;
    // Use query() instead of execute() to avoid prepared statement issues with static conditions
    const [rows] = values.length > 0
      ? await pool.execute(query, values)
      : await pool.query(query);
    return rows;
  }

  static async deleteUser(userId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE Users SET isDeleted = 1, deletedAt = NOW() WHERE userId = ?',
      [userId]
    );
    return result;
  }

  static async restoreUser(userId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE Users SET isDeleted = 0, deletedAt = NULL WHERE userId = ?',
      [userId]
    );
    return result;
  }
}

module.exports = UserDAO;