const ProductService = require("../services/ProductService");
const { getRelatedProducts } = require("../services/RelatedProductService");
const PriceDAO = require("../dao/PriceDAO");

class ProductController {
  static async getProducts(req, res) {
    try {
      const products = await ProductService.getAll();
      res.json({ success: true, products });
    } catch (err) {
      console.error("getProducts error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getProductById(req, res) {
    try {
      const product = await ProductService.getById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Sản phẩm không tồn tại" });
      }
      res.json({ success: true, product });
    } catch (err) {
      console.error("getProductById error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const products = await ProductService.getByCategory(categoryId);
      res.json({ success: true, products });
    } catch (err) {
      console.error("getByCategory error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  static async addProduct(req, res) {
    try {
      const { name, description, image, categoryId, prices, stock } = req.body;

      // 1. Tạo product
      const newProduct = await ProductService.create({
        name,
        description,
        image,
        categoryId,
        stock: stock || 0
      });

      const productId = newProduct.productId || newProduct.insertId;

      // 2. Thêm prices nếu có
      if (prices && typeof prices === 'object' && Object.keys(prices).length > 0) {
        for (const [optionName, optionPrice] of Object.entries(prices)) {
          if (optionName && optionPrice != null) {
            await PriceDAO.create({
              productId: Number(productId),
              optionName: optionName.trim(),
              optionPrice: Number(optionPrice)
            });
          }
        }
      }

      // 3. Lấy lại product đầy đủ
      const result = await ProductService.getById(productId);

      res.status(201).json({
        success: true,
        message: "Thêm sản phẩm thành công",
        product: result,
        productId: productId  // ✅ Trả về productId để frontend dùng
      });
    } catch (err) {
      console.error("addProduct error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, description, image, categoryId, prices, stock } = req.body;

      // 1. Update thông tin cơ bản của product
      const updatedProduct = await ProductService.update(id, {
        name,
        description,
        image,
        categoryId,
        stock
      });

      // 2. Xử lý prices nếu có
      // - Nếu client gửi prices = {} (rỗng) => hiểu là muốn xóa hết giá
      // - Nếu client không gửi field prices => giữ nguyên giá cũ
      if (prices && typeof prices === 'object') {
        // 2.1 Xóa các price không còn dùng (an toàn với FK)
        await PriceDAO.deleteByProductId(id);

        // 2.2 Upsert theo optionName để tránh tạo duplicate
        const existing = await PriceDAO.getAll(id);
        const byOptionName = new Map(
          (existing || [])
            .filter((p) => p && p.optionName != null)
            .map((p) => [String(p.optionName).trim(), p])
        );

        const entries = Object.entries(prices);
        for (const [rawOptionName, rawOptionPrice] of entries) {
          const optionName = String(rawOptionName || "").trim();
          if (!optionName) continue;

          if (rawOptionPrice == null || rawOptionPrice === '') continue;
          const optionPrice = Number(rawOptionPrice);

          const existingRow = byOptionName.get(optionName);
          if (existingRow?.priceId) {
            await PriceDAO.update(existingRow.priceId, { optionName, optionPrice });
          } else {
            await PriceDAO.create({
              productId: Number(id),
              optionName,
              optionPrice
            });
          }
        }
      }

      // 3. Lấy lại product với prices mới
      const result = await ProductService.getById(id);
      
      res.json({
        success: true,
        message: "Cập nhật sản phẩm thành công",
        product: result
      });
    } catch (err) {
      console.error("updateProduct error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  static async deleteProduct(req, res) {
    try {
      const ok = await ProductService.delete(req.params.id);
      if (!ok) {
        return res.status(404).json({ message: "Không tồn tại" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("deleteProduct error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  // ⭐⭐⭐ THÊM HÀM RELATED PRODUCT TẠI ĐÂY
  static async getRelatedProduct(req, res) {
  try {
    const productId = parseInt(req.params.id);
    const items = await getRelatedProducts(productId);
    res.json({ success: true, related: items });
  } catch (err) {
    console.error("getRelatedProduct error:", err);
    res.status(500).json({ message: err.message });
  }
  }
}

module.exports = ProductController;
