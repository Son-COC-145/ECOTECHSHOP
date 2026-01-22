const { getPool } = require("../config/db");

class ProductImageDAO {
  static async getByProductId(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductImage WHERE productId = ?',
      [productId]
    );
    return rows;
  }

  static async create({ productId, imageUrl, color }) {
    try {
      const pool = getPool();
      const colorValue = color && color.trim() ? color.trim() : null;

      const [result] = await pool.execute(`
        INSERT INTO ProductImage (productId, imageUrl, color)
        VALUES (?, ?, ?)
      `, [productId, imageUrl, colorValue]);

      return { imageId: result.insertId };
    } catch (error) {
      console.error('ProductImageDAO create error:', error);
      throw error;
    }
  }

  static async update(imageId, { imageUrl, color }) {
    const pool = getPool();
    const [result] = await pool.execute(`
      UPDATE ProductImage
      SET imageUrl = ?, color = ?
      WHERE imageId = ?
    `, [imageUrl, color, imageId]);

    return result;
  }

  static async delete(imageId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM ProductImage WHERE imageId = ?',
      [imageId]
    );
    return result;
  }

  static async deleteByProductId(productId) {
    try {
      const pool = getPool();
      console.log("ProductImageDAO.deleteByProductId - Deleting all images for productId:", productId);
      
      const [result] = await pool.execute(
        'DELETE FROM ProductImage WHERE productId = ?',
        [productId]
      );
      
      console.log("ProductImageDAO.deleteByProductId - Deleted images. Rows affected:", result.affectedRows);
      return result;
    } catch (error) {
      console.error("ProductImageDAO.deleteByProductId - Error:", error);
      throw error;
    }
  }
}

module.exports = ProductImageDAO;