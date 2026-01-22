const { getPool } = require('../config/db');

class PromotionDAO {
  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Promotion ORDER BY startDate DESC'
    );
    return rows;
  }

  static async create(data) {
    const pool = getPool();
    const { code, description, discountPercent, startDate, endDate } = data;

    const [result] = await pool.execute(`
      INSERT INTO Promotion (code, description, discountPercent, startDate, endDate)
      VALUES (?, ?, ?, ?, ?)
    `, [code, description, discountPercent, startDate, endDate]);

    return { promotionId: result.insertId };
  }

  static async getByCode(code) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Promotion WHERE code = ?',
      [code]
    );
    return rows[0];
  }
}

module.exports = PromotionDAO;