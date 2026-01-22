const { getPool } = require('../config/db');

class ReviewDAO {
  static async getByProduct(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT r.*, u.username
      FROM Review r
      JOIN Users u ON r.userId = u.userId
      WHERE r.productId = ?
      ORDER BY r.createdAt DESC
    `, [productId]);
    return rows;
  }

  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT userId, productId, rating
      FROM Review
    `);
    return rows;
  }

  static async getByUserOrderProduct({ userId, orderId, productId }) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT *
      FROM Review
      WHERE userId = ? AND productId = ?
    `, [userId, productId]);
    return rows[0];
  }

  static async getByUserProduct({ userId, productId }) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT *
      FROM Review
      WHERE userId = ? AND productId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `, [userId, productId]);
    return rows[0];
  }

  static async create(data) {
    const pool = getPool();
    const { userId, productId, rating, comment } = data;

    const [result] = await pool.execute(`
      INSERT INTO Review (userId, productId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, NOW())
    `, [userId, productId, rating, comment || '']);

    return { reviewId: result.insertId };
  }

  static async update(id, data) {
    const pool = getPool();
    const { rating, comment } = data;

    const [result] = await pool.execute(`
      UPDATE Review
      SET rating = ?, comment = ?
      WHERE reviewId = ?
    `, [rating, comment, id]);

    return result;
  }

  static async delete(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM Review WHERE reviewId = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT *
      FROM Review
      WHERE reviewId = ?
    `, [id]);
    return rows[0];
  }
}

module.exports = ReviewDAO;