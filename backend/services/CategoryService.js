const CategoryDAO = require('../dao/CategoryDAO');
const Category = require('../models/Category');

class CategoryService {
  static async getCategories() {
    const rows = await CategoryDAO.getAll();
    return rows.map(row => new Category(row));
  }

  static async getCategoryById(id) {
    const row = await CategoryDAO.getById(id);
    return row ? new Category(row) : null;
  }

  static async createCategory(data) {
    await CategoryDAO.create(data);
  }

  static async updateCategory(id, data) {
    await CategoryDAO.update(id, data);
  }

  static async deleteCategory(id) {
    return await CategoryDAO.deleteById(id);
  }
}

module.exports = CategoryService;
