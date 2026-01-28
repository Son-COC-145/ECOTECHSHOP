// services/ProductService.js
const ProductDAO = require("../dao/ProductDAO");
const PriceDAO = require("../dao/PriceDAO");
const ProductImageDAO = require("../dao/ProductImageDAO");
// Nếu sau này muốn gắn attributes cho detail: 
const ProductAttributeValueDAO = require("../dao/ProductAttributeValueDAO");

class ProductService {
  // helper: convert price list -> prices object
  _toPricesObject(pricesList) {
    const pricesObj = {};
    for (const p of pricesList || []) {
      if (p.optionName != null && p.optionPrice != null) {
        // Chuyển "default_X" về rỗng để hiển thị
        const displayName = String(p.optionName).startsWith('default_') ? '' : p.optionName;
        pricesObj[p.optionName] = Number(p.optionPrice);
      }
    }
    return pricesObj;
  }

  /**
   * GET ALL PRODUCTS (an toàn cho site khách)
   * - Giữ nguyên fields cũ từ ProductDAO.getAll()
   * - Thêm: pricesList + prices (object) + primaryImageUrl
   * - includeDeleted: true (admin), false (frontend user)
   */
  async getAll(includeDeleted = false) {
    const products = await ProductDAO.getAll(includeDeleted); // recordset array

    // Lấy toàn bộ price 1 lần để tránh N+1
    const allPrices = await PriceDAO.getAll(); // lấy tất cả ProductPrice

    // Gom prices theo productId
    const pricesByProductId = new Map();
    for (const price of allPrices) {
      const pid = price.productId;
      if (!pricesByProductId.has(pid)) pricesByProductId.set(pid, []);
      pricesByProductId.get(pid).push(price);
    }

    return products.map((p) => {
      const pricesList = pricesByProductId.get(p.productId) || [];
      return {
        ...p, // giữ nguyên: productId, name, image, categoryName, ...
        // field mới (không phá cũ)
        pricesList,                    // dạng array chuẩn
        prices: this._toPricesObject(pricesList), // dạng object cho UI admin hiện tại
        primaryImageUrl: p.image || null,         // an toàn, không đụng ProductImage
      };
    });
  }

  /**
   * GET BY ID
   * - DAO đã trả productPrices + productImages :contentReference[oaicite:7]{index=7}
   * - Giữ nguyên 2 field này để không gãy nơi khác
   * - Thêm pricesList + prices + primaryImageUrl + attributes (optional)
   */
  async getById(id) {
    const product = await ProductDAO.getById(id);
    if (!product) return null;

    // Backward compatible: productPrices/productImages vẫn giữ
    const pricesList = product.productPrices || [];
    const imagesList = product.productImages || [];

    // OPTIONAL: lấy attributes cho trang chi tiết nếu bạn muốn (không bắt buộc)
    // an toàn vì chỉ add field mới
    let attributes = [];
    try {
      attributes = await ProductAttributeValueDAO.getByProduct(id); // recordset :contentReference[oaicite:8]{index=8}
    } catch (e) {
      // bỏ qua nếu có lỗi để không làm gãy site
      attributes = [];
    }

    // xác định ảnh chính (fallback về Product.image)
    const primaryImg =
      imagesList.find((x) => x.isPrimary) ||
      imagesList[0] ||
      null;

    return {
      ...product,
      // field mới:
      pricesList,
      prices: this._toPricesObject(pricesList),
      images: imagesList,
      primaryImageUrl: primaryImg?.imageUrl || product.image || null,
      attributes,
    };
  }

  /**
   * GET BY CATEGORY
   * - sửa để trả về array thuần, không trả object mssql
   * - cũng thêm prices giống getAll (an toàn)
   */
  async getByCategory(categoryId) {
    const result = await ProductDAO.getByCategory(categoryId);
    const products = Array.isArray(result) ? result : (result?.recordset || []);

    const allPrices = await PriceDAO.getAll();
    const pricesByProductId = new Map();
    for (const price of allPrices) {
      const pid = price.productId;
      if (!pricesByProductId.has(pid)) pricesByProductId.set(pid, []);
      pricesByProductId.get(pid).push(price);
    }

    return products.map((p) => {
      const pricesList = pricesByProductId.get(p.productId) || [];
      return {
        ...p,
        pricesList,
        prices: this._toPricesObject(pricesList),
        primaryImageUrl: p.image || null,
      };
    });
  }

  async create(data) {
    // ProductDAO.create() trả về productId trực tiếp
    const productId = await ProductDAO.create(data);
    return productId;
  }

  async update(productId, data) {
    return ProductDAO.update(productId, data);
  }

  async delete(id, userId = null) {
    try {
      console.log("ProductService.delete - Soft deleting product with id:", id);
      
      // Kiểm tra sản phẩm có trong OrderItem không
      const { getPool } = require('../config/db');
      const pool = getPool();
      const [orderItems] = await pool.execute(
        'SELECT COUNT(*) as count FROM OrderItem WHERE productId = ?',
        [id]
      );
      
      const hasOrders = orderItems[0].count > 0;
      
      if (hasOrders) {
        console.log(`ProductService.delete - Product ${id} has ${orderItems[0].count} orders. Performing soft delete.`);
      }
      
      // Soft delete sản phẩm (không xóa prices/images)
      const result = await ProductDAO.delete(id, userId);
      console.log("ProductService.delete - Product soft deleted successfully.");
      
      return { 
        ...result, 
        softDeleted: true,
        hasOrders,
        orderCount: orderItems[0].count
      };
    } catch (error) {
      console.error("ProductService.delete - Error:", error);
      throw error;
    }
  }

  // Khôi phục sản phẩm đã xóa
  async restore(id) {
    try {
      console.log("ProductService.restore - Restoring product with id:", id);
      const result = await ProductDAO.restore(id);
      console.log("ProductService.restore - Product restored successfully.");
      return result;
    } catch (error) {
      console.error("ProductService.restore - Error:", error);
      throw error;
    }
  }

  // Cập nhật trạng thái sản phẩm
  async updateStatus(id, status) {
    try {
      console.log(`ProductService.updateStatus - Updating product ${id} status to ${status}`);
      const result = await ProductDAO.updateStatus(id, status);
      console.log("ProductService.updateStatus - Status updated successfully.");
      return result;
    } catch (error) {
      console.error("ProductService.updateStatus - Error:", error);
      throw error;
    }
  }
}

module.exports = new ProductService();

module.exports = new ProductService();