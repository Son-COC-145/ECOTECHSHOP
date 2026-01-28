const { getPool } = require("../config/db");

class PriceDAO {
  // Lấy tất cả giá (không filter)
  static async getAll(productId = null) {
    const pool = getPool();
    
    if (productId) {
      // Nếu có productId, lọc theo productId
      const [rows] = await pool.execute(
        'SELECT * FROM ProductPrice WHERE productId = ? ORDER BY priceId ASC',
        [productId]
      );
      return rows;
    }
    
    // Không có productId, lấy tất cả
    const [rows] = await pool.execute(
      'SELECT * FROM ProductPrice ORDER BY productId, priceId ASC'
    );
    return rows;
  }

  // Lấy giá theo productId (explicit method)
  static async getByProductId(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductPrice WHERE productId = ? ORDER BY priceId ASC',
      [productId]
    );
    return rows;
  }

  // Tạo giá mới
  static async create(data) {
    const pool = getPool();
    const { productId, optionName, optionPrice } = data;
    
    console.log("PriceDAO.create - Creating price:", { productId, optionName, optionPrice });
    
    const [result] = await pool.execute(
      `INSERT INTO ProductPrice (productId, optionName, optionPrice, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [productId, optionName || '', optionPrice]
    );
    
    console.log("PriceDAO.create - Created with priceId:", result.insertId);
    return { priceId: result.insertId, ...data };
  }

  // Cập nhật giá
  static async update(priceId, data) {
    const pool = getPool();
    const { optionName, optionPrice } = data;
    
    console.log("PriceDAO.update - Updating price:", { priceId, optionName, optionPrice });
    
    const [result] = await pool.execute(
      `UPDATE ProductPrice 
       SET optionName = ?, optionPrice = ?, updatedAt = NOW()
       WHERE priceId = ?`,
      [optionName || '', optionPrice, priceId]
    );
    
    console.log("PriceDAO.update - Rows affected:", result.affectedRows);
    return result;
  }

  // Xóa giá theo priceId
  static async delete(priceId) {
    const pool = getPool();
    
    console.log("PriceDAO.delete - Deleting priceId:", priceId);
    
    // Kiểm tra xem price có đang được sử dụng trong OrderItem không
    const [orderItems] = await pool.execute(
      'SELECT COUNT(*) as count FROM OrderItem WHERE productPriceId = ?',
      [priceId]
    );
    
    if (orderItems[0].count > 0) {
      console.log("PriceDAO.delete - Price is referenced by orders, skipping delete");
      return { affectedRows: 0, skipped: true };
    }
    
    const [result] = await pool.execute(
      'DELETE FROM ProductPrice WHERE priceId = ?',
      [priceId]
    );
    
    console.log("PriceDAO.delete - Rows affected:", result.affectedRows);
    return result;
  }

  // Xóa tất cả giá của product (chỉ những giá không được order sử dụng)
  static async deleteByProductId(productId) {
    try {
      const pool = getPool();
      console.log("PriceDAO.deleteByProductId - Deleting UNUSED prices for productId:", productId);

      const [result] = await pool.execute(
        `DELETE pp FROM ProductPrice pp
         WHERE pp.productId = ?
         AND NOT EXISTS (
           SELECT 1 FROM OrderItem oi WHERE oi.productPriceId = pp.priceId
         )`,
        [productId]
      );

      console.log("PriceDAO.deleteByProductId - Deleted unused prices. Rows affected:", result.affectedRows);
      return result;
    } catch (error) {
      console.error("PriceDAO.deleteByProductId - Error:", error);
      throw error;
    }
  }
}

module.exports = PriceDAO;