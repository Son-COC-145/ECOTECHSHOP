const { getPool } = require("../config/db");

class AddressDAO {
  async getByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM Address WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC`,
      [userId]
    );
    return rows;
  }

  async create({ userId, fullName, phone, province, district, ward, detail, isDefault }) {
    const pool = getPool();
    
    // Nếu isDefault = 1, clear các địa chỉ default khác
    if (isDefault) {
      await this.clearDefault(userId);
    }
    
    const [result] = await pool.execute(
      `INSERT INTO Address (userId, fullName, phone, province, district, ward, detail, isDefault)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, fullName, phone, province, district, ward, detail, isDefault || 0]
    );
    
    // Trả về address vừa tạo
    const [rows] = await pool.execute(
      `SELECT * FROM Address WHERE addressId = ?`,
      [result.insertId]
    );
    return rows[0];
  }

  async update(addressId, userId, data) {
    const pool = getPool();
    const { fullName, phone, province, district, ward, detail, isDefault } = data;
    
    // Nếu isDefault = 1, clear các địa chỉ default khác
    if (isDefault) {
      await this.clearDefault(userId);
    }
    
    await pool.execute(
      `UPDATE Address 
       SET fullName = ?, phone = ?, province = ?, district = ?, ward = ?, detail = ?, isDefault = ?
       WHERE addressId = ? AND userId = ?`,
      [fullName, phone, province, district, ward, detail, isDefault || 0, addressId, userId]
    );
    
    // Trả về address đã cập nhật
    const [rows] = await pool.execute(
      `SELECT * FROM Address WHERE addressId = ?`,
      [addressId]
    );
    return rows[0];
  }

  async isUsedByOrders(addressId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM Orders WHERE addressId = ?`,
      [addressId]
    );
    return rows[0].count > 0;
  }

  async delete(addressId, userId) {
    const pool = getPool();
    await pool.execute(
      `DELETE FROM Address WHERE addressId = ? AND userId = ?`,
      [addressId, userId]
    );
  }

  async clearDefault(userId) {
    const pool = getPool();
    await pool.execute(
      `UPDATE Address SET isDefault = 0 WHERE userId = ?`,
      [userId]
    );
  }
}

module.exports = new AddressDAO();