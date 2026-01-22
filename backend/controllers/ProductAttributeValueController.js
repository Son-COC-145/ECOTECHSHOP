const ProductAttributeValueService = require('../services/ProductAttributeValueService');

class ProductAttributeValueController {
  static async getByProduct(req, res) {
    try {
      const values = await ProductAttributeValueService.getByProduct(req.params.productId);
      res.json({ success: true, values });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { productId, attributeId, value } = req.body;

      if (!productId || !attributeId || !value) {
        return res.status(400).json({
          success: false,
          message: "Thiếu dữ liệu productId / attributeId / value"
        });
      }

      await ProductAttributeValueService.addAttributeValue({ productId, attributeId, value });

      res.status(201).json({ success: true, message: "Created successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = ProductAttributeValueController;
