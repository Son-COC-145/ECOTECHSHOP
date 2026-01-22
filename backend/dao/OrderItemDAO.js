const { getPool } = require('../config/db');

class OrderItemDAO {
  // Backward-compatible alias (some services call getByOrder)
  async getByOrder(orderId) {
    return this.getByOrderId(orderId);
  }

  async getByOrderId(orderId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        oi.*,
        p.name AS productName,
        p.image AS productImage,
        pp.optionName,
        pp.optionPrice,
        pi.imageUrl,
        pi.color,
        c.name AS categoryName,
        COALESCE(pi.imageUrl, p.image) AS image,
        p.image AS fallbackImage
      FROM OrderItem oi
      JOIN Product p ON oi.productId = p.productId
      LEFT JOIN Category c ON p.categoryId = c.categoryId
      LEFT JOIN ProductPrice pp ON oi.productPriceId = pp.priceId
      LEFT JOIN ProductImage pi ON oi.productImageId = pi.imageId
      WHERE oi.orderId = ?
    `, [orderId]);
    return rows;
  }

  async create(data) {
    const pool = getPool();
    const [result] = await pool.execute(`
      INSERT INTO OrderItem (orderId, productId, productPriceId, productImageId, quantity, unitPrice)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.orderId,
      data.productId,
      data.productPriceId,
      data.productImageId,
      data.quantity,
      data.unitPrice
    ]);
    return { orderItemId: result.insertId };
  }

  async createMany(orderId, items, connection = null) {
    const executor = connection || getPool();

    for (const item of items) {
      await executor.execute(`
        INSERT INTO OrderItem (
          orderId, productId, productPriceId, productImageId, quantity, unitPrice
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.productId,
        item.productPriceId,
        item.productImageId,
        item.quantity,
        item.unitPrice
      ]);
    }
  }

  async deleteByOrder(orderId, connection = null) {
    const executor = connection || getPool();
    await executor.execute('DELETE FROM OrderItem WHERE orderId = ?', [orderId]);
  }
}

module.exports = new OrderItemDAO();