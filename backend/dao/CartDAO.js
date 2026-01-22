const { getPool } = require("../config/db");

class CartDAO {
  async getCartId(userId) {
    const pool = getPool();
    // Tìm cart của user, nếu chưa có thì tạo mới
    let [rows] = await pool.execute(
      `SELECT cartId FROM Cart WHERE userId = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      const [result] = await pool.execute(
        `INSERT INTO Cart (userId) VALUES (?)`,
        [userId]
      );
      return result.insertId;
    }
    
    return rows[0].cartId;
  }

  async getItems(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `
      SELECT 
        ci.cartItemId,
        ci.cartId,
        ci.productId,
        ci.productPriceId,
        ci.productImageId,
        ci.quantity,
        ci.price,
        p.name AS productName,
        p.image,
        p.description,
        c.name AS categoryName,
        pp.optionName,
        pp.optionPrice,
        pi.imageUrl AS variantImage,
        pi.color
      FROM CartItem ci
      JOIN Cart cart ON ci.cartId = cart.cartId
      JOIN Product p ON ci.productId = p.productId
      LEFT JOIN Category c ON p.categoryId = c.categoryId
      LEFT JOIN ProductPrice pp ON ci.productPriceId = pp.priceId
      LEFT JOIN ProductImage pi ON ci.productImageId = pi.imageId
      WHERE cart.userId = ?
      ORDER BY ci.cartItemId DESC
      `,
      [userId]
    );
    return rows;
  }

  async addItem({ cartId, productId, productPriceId, productImageId, quantity, price }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO CartItem (cartId, productId, productPriceId, productImageId, quantity, price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cartId, productId, productPriceId, productImageId, quantity, price]
    );
    return result.insertId;
  }

  async updateQuantity(cartItemId, quantity) {
    const pool = getPool();
    await pool.execute(
      `UPDATE CartItem SET quantity = ? WHERE cartItemId = ?`,
      [quantity, cartItemId]
    );
  }

  async removeItem(cartItemId) {
    const pool = getPool();
    await pool.execute(
      `DELETE FROM CartItem WHERE cartItemId = ?`,
      [cartItemId]
    );
  }

  async clearCart(userId) {
    const pool = getPool();
    await pool.execute(
      `DELETE ci FROM CartItem ci
       JOIN Cart c ON ci.cartId = c.cartId
       WHERE c.userId = ?`,
      [userId]
    );
  }

  async removeItems(userId, items) {
    const pool = getPool();
    
    for (const item of items) {
      await pool.execute(
        `DELETE ci FROM CartItem ci
         JOIN Cart c ON ci.cartId = c.cartId
         WHERE c.userId = ? 
           AND ci.productId = ?
           AND (ci.productPriceId = ? OR (ci.productPriceId IS NULL AND ? IS NULL))
           AND (ci.productImageId = ? OR (ci.productImageId IS NULL AND ? IS NULL))`,
        [
          userId, 
          item.productId, 
          item.productPriceId, item.productPriceId,
          item.productImageId, item.productImageId
        ]
      );
    }
  }
}

module.exports = new CartDAO();