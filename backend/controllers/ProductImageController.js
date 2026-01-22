const ProductImageService = require("../services/ProductImageService");

class ProductImageController {
  
  static async getByProduct(req, res) {
    try {
      const productId = req.params.productId;
      const images = await ProductImageService.getImages(productId);
      res.json({ success: true, images });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { productId, imageUrl, color } = req.body;

      // Validation
      if (!productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu productId' 
        });
      }

      if (!imageUrl || !imageUrl.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu imageUrl' 
        });
      }

      // Convert productId to number
      const productIdNum = Number(productId);
      if (isNaN(productIdNum)) {
        return res.status(400).json({ 
          success: false, 
          message: 'productId không hợp lệ' 
        });
      }

      await ProductImageService.addImage({ 
        productId: productIdNum, 
        imageUrl: imageUrl.trim(), 
        color: color?.trim() || null 
      });

      res.json({ success: true, message: "Thêm ảnh thành công" });
    } catch (err) {
      console.error('ProductImage create error:', err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Lỗi khi thêm ảnh' 
      });
    }
  }

  static async update(req, res) {
    try {
      const imageId = req.params.imageId;
      const { imageUrl, color } = req.body;

      await ProductImageService.updateImage(imageId, { imageUrl, color });

      res.json({ success: true, message: "Cập nhật ảnh thành công" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const imageId = req.params.imageId;
      await ProductImageService.deleteImage(imageId);

      res.json({ success: true, message: "Xóa ảnh thành công" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = ProductImageController;
