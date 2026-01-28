const ProductService = require("../services/ProductService");
const { getRelatedProducts } = require("../services/RelatedProductService");
const PriceDAO = require("../dao/PriceDAO");

class ProductController {
  static async getProducts(req, res) {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const products = await ProductService.getAll(includeDeleted);
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
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
      res.json({ success: true, product });
    } catch (err) {
      console.error("getProductById error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  static async getByCategory(req, res) {
    try {
      const products = await ProductService.getByCategory(req.params.categoryId);
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
        stock
      });

      const productId = newProduct.productId;

      // 2. Thêm prices nếu có
      if (prices && typeof prices === 'object' && Object.keys(prices).length > 0) {
        for (const [optionName, optionPrice] of Object.entries(prices)) {
          if (optionPrice != null && optionPrice !== '') {
            await PriceDAO.create({
              productId,
              optionName: optionName || '',
              optionPrice: Number(optionPrice)
            });
          }
        }
      }

      // 3. Lấy lại product với prices
      const result = await ProductService.getById(productId);

      res.status(201).json({
        success: true,
        message: "Thêm sản phẩm thành công",
        product: result,
        productId
      });
    } catch (err) {
      console.error("addProduct error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, description, image, categoryId, prices, stock } = req.body;

      console.log("========== UPDATE PRODUCT START ==========");
      console.log("ProductController.updateProduct - productId:", id);
      console.log("ProductController.updateProduct - prices received:", JSON.stringify(prices));

      // 1. Update thông tin cơ bản của product
      await ProductService.update(id, {
        name,
        description,
        image,
        categoryId,
        stock
      });

      // 2. Xử lý prices
      if (prices && typeof prices === 'object') {
        console.log("Processing prices...");
        
        // 2.1 Lấy danh sách giá hiện tại của product này
        const existingPrices = await PriceDAO.getByProductId(id);
        console.log("Existing prices count:", existingPrices.length);
        console.log("Existing prices:", existingPrices.map(p => ({ id: p.priceId, name: p.optionName, price: p.optionPrice })));

        // 2.2 Tạo map từ optionName -> priceRow
        const existingMap = new Map();
        for (const p of existingPrices) {
          const key = String(p.optionName || '').trim();
          existingMap.set(key, p);
        }

        // 2.3 Tạo set các optionName từ request
        const requestedOptions = new Set();
        for (const [optionName] of Object.entries(prices)) {
          requestedOptions.add(String(optionName || '').trim());
        }

        // 2.4 Xóa các giá không còn trong request
        for (const [optionName, priceRow] of existingMap.entries()) {
          if (!requestedOptions.has(optionName)) {
            console.log(`Deleting price: "${optionName}" (priceId: ${priceRow.priceId})`);
            try {
              const deleteResult = await PriceDAO.delete(priceRow.priceId);
              if (deleteResult.skipped) {
                console.log(`Price "${optionName}" is used by orders, kept but may be outdated`);
              }
            } catch (err) {
              console.warn(`Cannot delete price "${optionName}":`, err.message);
            }
          }
        }

        // 2.5 Update hoặc thêm mới các giá
        for (const [rawOptionName, rawOptionPrice] of Object.entries(prices)) {
          const optionName = String(rawOptionName || '').trim();
          
          // Skip nếu giá trị không hợp lệ
          if (rawOptionPrice == null || rawOptionPrice === '' || isNaN(Number(rawOptionPrice))) {
            console.log(`Skipping "${optionName}" - invalid price value:`, rawOptionPrice);
            continue;
          }
          
          const optionPrice = Number(rawOptionPrice);
          const existingRow = existingMap.get(optionName);
          
          if (existingRow && existingRow.priceId) {
            // Update giá hiện có
            console.log(`Updating price: "${optionName}" = ${optionPrice} (priceId: ${existingRow.priceId})`);
            await PriceDAO.update(existingRow.priceId, { 
              optionName, 
              optionPrice 
            });
          } else {
            // Thêm giá mới
            console.log(`Creating new price: "${optionName}" = ${optionPrice}`);
            await PriceDAO.create({
              productId: Number(id),
              optionName,
              optionPrice
            });
          }
        }
      }

      console.log("========== UPDATE PRODUCT END ==========");

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
      const userId = req.user?.userId || null;
      const result = await ProductService.delete(req.params.id, userId);
      
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy sản phẩm" 
        });
      }
      
      res.json({ 
        success: true,
        message: result.hasOrders 
          ? `Sản phẩm đã được ẩn (có ${result.orderCount} đơn hàng liên quan)` 
          : "Sản phẩm đã được xóa",
        softDeleted: true,
        hasOrders: result.hasOrders
      });
    } catch (err) {
      console.error("deleteProduct error:", err);
      res.status(500).json({ 
        success: false,
        message: err.message 
      });
    }
  }

  static async getRelatedProduct(req, res) {
    try {
      const { id } = req.params;
      const relatedProducts = await getRelatedProducts(id);
      res.json({ success: true, products: relatedProducts });
    } catch (err) {
      console.error("getRelatedProduct error:", err);
      res.status(500).json({ message: err.message });
    }
  }

  static async restoreProduct(req, res) {
    try {
      const result = await ProductService.restore(req.params.id);
      
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy sản phẩm" 
        });
      }
      
      res.json({ 
        success: true,
        message: "Khôi phục sản phẩm thành công"
      });
    } catch (err) {
      console.error("restoreProduct error:", err);
      res.status(500).json({ 
        success: false,
        message: err.message 
      });
    }
  }

  static async updateProductStatus(req, res) {
    try {
      const { status } = req.body;
      
      if (!['active', 'inactive', 'discontinued'].includes(status)) {
        return res.status(400).json({ 
          success: false,
          message: "Trạng thái không hợp lệ" 
        });
      }
      
      const result = await ProductService.updateStatus(req.params.id, status);
      
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy sản phẩm" 
        });
      }
      
      res.json({ 
        success: true,
        message: "Cập nhật trạng thái thành công"
      });
    } catch (err) {
      console.error("updateProductStatus error:", err);
      res.status(500).json({ 
        success: false,
        message: err.message 
      });
    }
  }
}

module.exports = ProductController;