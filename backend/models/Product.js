class Product {
  constructor({
    productId,
    categoryId,
    name,
    description,
    stock,
    rating,
    sold,
    createdAt,
    updatedAt,
    categoryName,

    // giá từ bảng ProductPrice
    productPrices = [],

    // ảnh + màu từ ProductImage
    productImages = [],

    // dữ liệu cũ fallback
    image = null
  }) {
    this.productId = productId;
    this.categoryId = categoryId;
    this.name = name;
    this.description = description;
    this.stock = stock;
    this.rating = rating;
    this.sold = sold;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.categoryName = categoryName;

    // dữ liệu chuẩn SQL
    this.productPrices = productPrices;  // FE dùng để thay đổi giá
    this.productImages = productImages;  // FE dùng để chọn màu

    // fallback nếu database cũ vẫn có 1 ảnh
    this.image = image;
  }
}

module.exports = Product;
