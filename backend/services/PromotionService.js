const PromotionDAO = require('../dao/PromotionDAO');
const Promotion = require('../models/Promotion');

class PromotionService {
  static async getAll() {
    const rows = await PromotionDAO.getAll();
    return rows.map(r => new Promotion(r));
  }

  static async create(data) {
    // Validate tránh trùng code
    const exist = await PromotionDAO.getByCode(data.code);
    if (exist) throw new Error("Mã giảm giá đã tồn tại");

    await PromotionDAO.create(data);
  }

  static async getByCode(code) {
    const row = await PromotionDAO.getByCode(code);
    return row ? new Promotion(row) : null;
  }
}

module.exports = PromotionService;
