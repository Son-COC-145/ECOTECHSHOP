const { getPool } = require('../config/db');

class AuthDAO {
  static async saveToken({ userId, refreshToken }) {
    const pool = getPool();
    
    const [exists] = await pool.execute(
      'SELECT * FROM Auth WHERE userId = ?',
      [userId]
    );

    if (exists.length > 0) {
      await pool.execute(`
        UPDATE Auth
        SET refreshToken = ?, createdAt = NOW()
        WHERE userId = ?
      `, [refreshToken, userId]);
    } else {
      await pool.execute(`
        INSERT INTO Auth (userId, refreshToken, createdAt)
        VALUES (?, ?, NOW())
      `, [userId, refreshToken]);
    }
  }

  static async getTokenByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Auth WHERE userId = ?',
      [userId]
    );
    return rows[0];
  }

  static async deleteToken(userId) {
    const pool = getPool();
    await pool.execute('DELETE FROM Auth WHERE userId = ?', [userId]);
  }
}

module.exports = AuthDAO;