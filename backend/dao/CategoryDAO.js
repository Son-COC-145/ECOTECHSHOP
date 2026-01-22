const { getPool } = require('../config/db');

class CategoryDAO {
  static async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Category ORDER BY createdAt DESC'
    );
    return rows;
  }

  static async getById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Category WHERE categoryId = ?',
      [id]
    );
    return rows[0];
  }

  static async create(data) {
    const pool = getPool();
    const { name, description, parentId, slug } = data;

    const [result] = await pool.execute(`
      INSERT INTO Category (name, description, parentId, slug, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [name, description || null, parentId || null, slug || null]);

    return { categoryId: result.insertId };
  }

  static async update(id, data) {
    const pool = getPool();
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    
    if (keys.length === 0) return;

    const setParts = keys.map(key => `${key} = ?`);
    const values = keys.map(key => data[key]);
    values.push(id);

    const query = `
      UPDATE Category
      SET ${setParts.join(', ')}, updatedAt = NOW()
      WHERE categoryId = ?
    `;

    const [result] = await pool.execute(query, values);
    return result;
  }

  static async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM Category WHERE categoryId = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = CategoryDAO;