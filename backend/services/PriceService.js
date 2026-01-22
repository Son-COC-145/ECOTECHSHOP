const PriceDAO = require('../dao/PriceDAO');

class PriceService {
  static async getPrices(productId) {
    // DAO đã trả về Price model → không cần new Price()
    return await PriceDAO.getAll(productId);
  }

  static async getPriceById(id) {
    return await PriceDAO.getById(id); // DAO đã map
  }

  static async createPrice(priceData) {
    await PriceDAO.create(priceData);
  }

  static async updatePrice(id, priceData) {
    await PriceDAO.update(id, priceData);
  }

  static async deletePrice(id) {
    await PriceDAO.delete(id);
  }
}

module.exports = PriceService;
