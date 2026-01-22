const { getPool } = require('../config/db');

class ProductAttributeValueDAO {
  static async getByProduct(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT
        pav.pavId,
        pav.productId,
        pav.attributeId,
        pav.value,
        pa.name AS attributeName,
        pa.valueType
      FROM ProductAttributeValue pav
      JOIN ProductAttribute pa ON pav.attributeId = pa.attributeId
      WHERE pav.productId = ?
      ORDER BY pa.name
    `, [productId]);
    return rows;
  }

  static async create(data) {
    const pool = getPool();
    const { productId, attributeId, value } = data;

    const [result] = await pool.execute(`
      INSERT INTO ProductAttributeValue (productId, attributeId, value, createdAt)
      VALUES (?, ?, ?, NOW())
    `, [productId, attributeId, value]);

    return { pavId: result.insertId };
  }

  static async deleteByProduct(productId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM ProductAttributeValue WHERE productId = ?',
      [productId]
    );
    return result;
  }
}

module.exports = ProductAttributeValueDAO;