const AttributeService = require('../services/AttributeService');

class AttributeController {
  static async getAttributes(req, res) {
    try {
      const { categoryId } = req.query;
      const attributes = await AttributeService.getAttributes(categoryId);
      res.json({ success: true, attributes });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getAttributeById(req, res) {
    try {
      const attribute = await AttributeService.getAttributeById(req.params.attributeId);

      if (!attribute)
        return res.status(404).json({ success: false, message: "Không tìm thấy thuộc tính" });

      res.json({ success: true, attribute });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async addAttribute(req, res) {
    try {
      await AttributeService.createAttribute(req.body);
      res.status(201).json({ success: true, message: "Tạo thuộc tính thành công" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateAttribute(req, res) {
    try {
      await AttributeService.updateAttribute(req.params.attributeId, req.body);
      res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteAttribute(req, res) {
    try {
      await AttributeService.deleteAttribute(req.params.attributeId);
      res.json({ success: true, message: "Xoá thành công" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = AttributeController;
