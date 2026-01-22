const AttributeDAO = require('../dao/AttributeDAO');
const Attribute = require('../models/Attribute');

class AttributeService {
  static async getAttributes(categoryId) {
    const rows = await AttributeDAO.getAll(categoryId);
    return rows.map(row => new Attribute(row));
  }

  static async getAttributeById(attributeId) {
    const row = await AttributeDAO.getById(attributeId);
    return row ? new Attribute(row) : null;
  }

  static async createAttribute(data) {
    return await AttributeDAO.create(data);
  }

  static async updateAttribute(attributeId, data) {
    return await AttributeDAO.update(attributeId, data);
  }

  static async deleteAttribute(attributeId) {
    return await AttributeDAO.delete(attributeId);
  }
}

module.exports = AttributeService;
