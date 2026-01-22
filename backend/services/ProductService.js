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
        pricesObj[p.optionName] = Number(p.optionPrice);
      }
    }
    return pricesObj;
  }

  /**
   * GET ALL PRODUCTS (an toàn cho site khách)
   * - Giữ nguyên fields cũ từ ProductDAO.getAll()
   * - Thêm: pricesList + prices (object) + primaryImageUrl
   */
  async getAll() {
    const products = await ProductDAO.getAll(); // recordset array :contentReference[oaicite:5]{index=5}

    // Lấy toàn bộ price 1 lần để tránh N+1
    const allPrices = await PriceDAO.getAll(); // lấy tất cả ProductPrice :contentReference[oaicite:6]{index=6}

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

  async delete(id) {
    try {
      console.log("ProductService.delete - Deleting product with id:", id);
      
      // 1. Xóa tất cả giá của sản phẩm trước
      try {
        await PriceDAO.deleteByProductId(id);
        console.log("ProductService.delete - Deleted all prices for product:", id);
      } catch (priceError) {
        console.error("ProductService.delete - Error deleting prices:", priceError);
        // Tiếp tục xóa dù có lỗi ở giá (có thể không có giá nào)
      }
      
      // 2. Xóa tất cả ảnh của sản phẩm
      try {
        await ProductImageDAO.deleteByProductId(id);
        console.log("ProductService.delete - Deleted all images for product:", id);
      } catch (imageError) {
        console.error("ProductService.delete - Error deleting images:", imageError);
        // Tiếp tục xóa dù có lỗi ở ảnh (có thể không có ảnh nào)
      }
      
      // 3. Cuối cùng mới xóa sản phẩm
      const result = await ProductDAO.delete(id);
      console.log("ProductService.delete - Product deleted successfully. Rows affected:", result.rowsAffected);
      
      return result;
    } catch (error) {
      console.error("ProductService.delete - Error:", error);
      throw error;
    }
  }
}

module.exports = new ProductService();