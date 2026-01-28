const { getPool } = require("../config/db");

class ProductDAO {
  // ================================
  // GET ALL PRODUCTS (bao gồm cả đã xóa cho admin)
  // ================================
  async getAll(includeDeleted = true) {
    const pool = getPool();
    let query = `
      SELECT p.*, c.name AS categoryName
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.categoryId
    `;
    
    if (!includeDeleted) {
      query += ' WHERE (p.isDeleted = FALSE OR p.isDeleted IS NULL)';
    }
    
    query += ' ORDER BY p.productId DESC';
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  // ================================
  // GET PRODUCT BY ID
  // ================================
  async getById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT p.*, c.name AS categoryName
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.categoryId
      WHERE p.productId = ?
    `, [id]);

    if (!rows[0]) return null;

    const product = rows[0];

    // Get prices
    const [prices] = await pool.execute(
      'SELECT * FROM ProductPrice WHERE productId = ?',
      [id]
    );
    product.productPrices = prices;

    // Get images
    const [images] = await pool.execute(
      'SELECT * FROM ProductImage WHERE productId = ?',
      [id]
    );
    product.productImages = images;

    return product;
  }

  // ================================
  // GET BY CATEGORY
  // ================================
  async getByCategory(categoryId, includeDeleted = false) {
    const pool = getPool();
    let query = `
      SELECT p.*, c.name AS categoryName
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.categoryId
      WHERE p.categoryId = ?
    `;
    
    if (!includeDeleted) {
      query += ' AND (p.isDeleted = FALSE OR p.isDeleted IS NULL) AND p.status = "active"';
    }
    
    query += ' ORDER BY p.productId DESC';
    
    const [rows] = await pool.execute(query, [categoryId]);
    return rows;
  }

  // ================================
  // GET PRODUCT PRICES ONLY
  // ================================
  async getPrices(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductPrice WHERE productId = ?',
      [productId]
    );
    return rows;
  }

  // ================================
  // GET PRODUCT IMAGES ONLY
  // ================================
  async getImages(productId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM ProductImage WHERE productId = ?',
      [productId]
    );
    return rows;
  }

  // ================================
  // CREATE PRODUCT
  // ================================
  async create(data) {
    try {
      const pool = getPool();
      console.log("ProductDAO.create - Input data:", data);

      const [result] = await pool.execute(`
        INSERT INTO Product (
          categoryId, name, description, image,
          stock, rating, sold, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        data.categoryId,
        data.name,
        data.description,
        data.image,
        data.stock ?? 0,
        data.rating ?? 0,
        data.sold ?? 0
      ]);

      console.log("ProductDAO.create - Result:", result);

      if (!result.insertId) {
        throw new Error("Không thể tạo sản phẩm - không có insertId");
      }

      const productId = Number(result.insertId);
      console.log("ProductDAO.create - Returning productId:", productId);
      return productId;
    } catch (error) {
      console.error("Error in ProductDAO.create:", error);
      throw error;
    }
  }

  // ================================
  // UPDATE PRODUCT
  // ================================
  async update(productId, data) {
    const pool = getPool();
    const allowed = [
      "categoryId", "name", "description",
      "image", "stock", "rating", "sold"
    ];

    const updates = Object.entries(data).filter(([key]) =>
      allowed.includes(key)
    );

    if (!updates.length) return { affectedRows: 0 };

    const setParts = updates.map(([key]) => `${key} = ?`);
    const values = updates.map(([, value]) => value);
    values.push(productId);

    const query = `
      UPDATE Product
      SET ${setParts.join(", ")}, updatedAt = NOW()
      WHERE productId = ?
    `;

    const [result] = await pool.execute(query, values);
    return result;
  }

  // ================================
  // SOFT DELETE PRODUCT
  // ================================
  async delete(id, userId = null) {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE Product 
       SET isDeleted = TRUE, 
           status = 'inactive',
           deletedAt = NOW(), 
           deletedBy = ?
       WHERE productId = ?`,
      [userId, id]
    );
    return result;
  }

  // ================================
  // RESTORE DELETED PRODUCT
  // ================================
  async restore(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE Product 
       SET isDeleted = FALSE, 
           status = 'active',
           deletedAt = NULL, 
           deletedBy = NULL
       WHERE productId = ?`,
      [id]
    );
    return result;
  }

  // ================================
  // HARD DELETE (chỉ dùng khi cần thiết)
  // ================================
  async hardDelete(id) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM Product WHERE productId = ?',
      [id]
    );
    return result;
  }

  // ================================
  // UPDATE STATUS
  // ================================
  async updateStatus(id, status) {
    const pool = getPool();
    const [result] = await pool.execute(
      'UPDATE Product SET status = ? WHERE productId = ?',
      [status, id]
    );
    return result;
  }
}

module.exports = new ProductDAO();