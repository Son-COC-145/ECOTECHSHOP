const ProductAttributeValueDAO = require('../dao/ProductAttributeValueDAO');
const ProductAttributeValue = require('../models/ProductAttributeValue');

class ProductAttributeValueService {
  static async getByProduct(productId) {
    const rows = await ProductAttributeValueDAO.getByProduct(productId);
    return rows.map(row => new ProductAttributeValue(row));
  }

  static async addAttributeValue(data) {
    return await ProductAttributeValueDAO.create(data);
  }
}

module.exports = ProductAttributeValueService;
