class Category {
  constructor({
    categoryId,
    name,
    description,
    parentId,
    slug,
    createdAt,
    updatedAt
  }) {
    this.categoryId = categoryId;
    this.name = name;
    this.description = description;
    this.parentId = parentId;
    this.slug = slug;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Category;
