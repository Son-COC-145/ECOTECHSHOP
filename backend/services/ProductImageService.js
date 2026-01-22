const ProductImageDAO = require("../dao/ProductImageDAO");

class ProductImageService {

  static async getImages(productId) {
    return await ProductImageDAO.getByProductId(productId);
  }

  static async addImage(data) {
    return await ProductImageDAO.create(data);
  }

  static async updateImage(imageId, data) {
    return await ProductImageDAO.update(imageId, data);
  }

  static async deleteImage(imageId) {
    return await ProductImageDAO.delete(imageId);
  }
}

module.exports = ProductImageService;
