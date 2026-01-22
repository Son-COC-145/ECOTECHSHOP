const { getPool } = require('../config/db');

class AttributeDAO {
  static async getAll(categoryId) {
    const pool = getPool();
    
    if (categoryId) {
      const [rows] = await pool.execute(
        'SELECT * FROM ProductAttribute WHERE categoryId = ?',
        [categoryId]
      );
      return rows;
    }

    const [rows] = await pool.execute('SELECT * FROM ProductAttribute');
    return rows;
  }

  static async getById(attributeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductAttribute WHERE attributeId = ?',
      [attributeId]
    );
    return rows[0];
  }

  static async create(data) {
    const pool = getPool();
    const { categoryId, name, valueType } = data;

    const [result] = await pool.execute(`
      INSERT INTO ProductAttribute (categoryId, name, valueType, createdAt, updatedAt)
      VALUES (?, ?, ?, NOW(), NOW())
    `, [categoryId, name, valueType]);

    return { attributeId: result.insertId };
  }

  static async update(attributeId, data) {
    const pool = getPool();
    const { name, valueType } = data;

    const [result] = await pool.execute(`
      UPDATE ProductAttribute
      SET name = ?, valueType = ?, updatedAt = NOW()
      WHERE attributeId = ?
    `, [name, valueType, attributeId]);

    return result;
  }

  static async delete(attributeId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM ProductAttribute WHERE attributeId = ?',
      [attributeId]
    );
    return result;
  }
}

module.exports = AttributeDAO;