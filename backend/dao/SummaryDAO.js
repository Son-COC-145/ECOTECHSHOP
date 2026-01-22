const { getPool } = require('../config/db');

class SummaryDAO {
  static async getByProduct(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductSummary WHERE productId = ?',
      [productId]
    );
    return rows[0];
  }

  static async create(data) {
    const pool = getPool();
    const { productId, summary, wordFreq, totalReviews } = data;

    const [result] = await pool.execute(`
      INSERT INTO ProductSummary (productId, summary, wordFreq, totalReviews, lastUpdated)
      VALUES (?, ?, ?, ?, NOW())
    `, [productId, summary, JSON.stringify(wordFreq), totalReviews]);

    return { summaryId: result.insertId };
  }

  static async update(productId, data) {
    const pool = getPool();
    const { summary, wordFreq, totalReviews } = data;

    const [result] = await pool.execute(`
      UPDATE ProductSummary
      SET summary = ?, wordFreq = ?, totalReviews = ?, lastUpdated = NOW()
      WHERE productId = ?
    `, [summary, JSON.stringify(wordFreq), totalReviews, productId]);

    return result;
  }
}

module.exports = SummaryDAO;