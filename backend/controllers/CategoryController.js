const CategoryService = require('../services/CategoryService');

class CategoryController {
  static async getCategories(req, res) {
    try {
      const categories = await CategoryService.getCategories();
      res.json({ success: true, categories });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getCategoryById(req, res) {
    try {
      const category = await CategoryService.getCategoryById(req.params.id);

      if (!category)
        return res.status(404).json({ message: 'Danh mục không tồn tại!' });

      res.json({ success: true, category });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async addCategory(req, res) {
    try {
      await CategoryService.createCategory(req.body);
      res.status(201).json({ success: true, message: 'Tạo danh mục thành công' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateCategory(req, res) {
    try {
      const id = req.params.id;
      await CategoryService.updateCategory(id, req.body);

      const updated = await CategoryService.getCategoryById(id);

      res.json({ success: true, category: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async deleteCategory(req, res) {
    try {
      const deleted = await CategoryService.deleteCategory(req.params.id);

      if (!deleted)
        return res.status(404).json({ message: 'Danh mục không tồn tại!' });

      res.json({ success: true, message: 'Xoá danh mục thành công!' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = CategoryController;
