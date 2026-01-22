const PromotionService = require('../services/PromotionService');

class PromotionController {
  static async getAll(req, res) {
    try {
      const promotions = await PromotionService.getAll();
      res.json({ success: true, promotions });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async create(req, res) {
    try {
      await PromotionService.create(req.body);
      res.status(201).json({ success: true, message: "Tạo promotion thành công" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getByCode(req, res) {
    try {
      const promotion = await PromotionService.getByCode(req.params.code);

      if (!promotion)
        return res.status(404).json({ success: false, message: "Không tìm thấy mã giảm giá" });

      res.json({ success: true, promotion });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = PromotionController;
