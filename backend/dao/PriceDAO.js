const { getPool } = require('../config/db');
const Price = require('../models/Price');

class PriceDAO {
  static async getAll(productId) {
    const pool = getPool();
    let rows;

    if (productId) {
      [rows] = await pool.execute(
        'SELECT * FROM ProductPrice WHERE productId = ?',
        [productId]
      );
    } else {
      [rows] = await pool.execute('SELECT * FROM ProductPrice');
    }

    return rows.map(row => new Price(row));
  }

  static async getById(priceId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductPrice WHERE priceId = ?',
      [priceId]
    );

    if (!rows[0]) return null;
    return new Price(rows[0]);
  }

  static async create(price) {
    try {
      const pool = getPool();
      const { productId, optionName, optionPrice } = price;

      console.log("PriceDAO.create - Input:", { productId, optionName, optionPrice });

      if (!productId || productId === null || productId === undefined) {
        throw new Error("productId không hợp lệ");
      }

      if (!optionName || !optionName.trim()) {
        throw new Error("optionName không hợp lệ");
      }

      if (optionPrice === undefined || optionPrice === null || isNaN(Number(optionPrice))) {
        throw new Error("optionPrice không hợp lệ");
      }

      const [result] = await pool.execute(`
        INSERT INTO ProductPrice (productId, optionName, optionPrice, createdAt, updatedAt)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [Number(productId), optionName.trim(), Number(optionPrice)]);

      console.log("PriceDAO.create - Price inserted successfully. insertId:", result.insertId);
      return { priceId: result.insertId };
    } catch (error) {
      console.error("PriceDAO.create - Error:", error);
      throw error;
    }
  }

  static async update(priceId, price) {
    const pool = getPool();
    const { optionName, optionPrice } = price;

    const [result] = await pool.execute(`
      UPDATE ProductPrice
      SET optionName = ?, optionPrice = ?, updatedAt = NOW()
      WHERE priceId = ?
    `, [optionName, optionPrice, priceId]);

    return result;
  }

  static async delete(priceId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM ProductPrice WHERE priceId = ?',
      [priceId]
    );
    return result;
  }

  static async deleteByProductId(productId) { 
    try {
      const pool = getPool();
      console.log("PriceDAO.deleteByProductId - Deleting UNUSED prices for productId:", productId);

      // Chỉ xóa các variant price KHÔNG bị OrderItem tham chiếu,
      // để tránh lỗi FK khi đơn hàng cũ đang dùng productPriceId.
      const [result] = await pool.execute(
        `
        DELETE pp
        FROM ProductPrice pp
        WHERE pp.productId = ?
          AND NOT EXISTS (
            SELECT 1
            FROM OrderItem oi
            WHERE oi.productPriceId = pp.priceId
          )
        `,
        [productId]
      );

      console.log(
        "PriceDAO.deleteByProductId - Deleted unused prices. Rows affected:",
        result.affectedRows
      );
      return result;
    } catch (error) {
      console.error("PriceDAO.deleteByProductId - Error:", error);
      throw error;
    }
  }
}

module.exports = PriceDAO;