class Attribute {
  constructor({ attributeId, categoryId, name, valueType, createdAt, updatedAt }) {
    this.attributeId = attributeId;
    this.categoryId = categoryId;
    this.name = name;
    this.valueType = valueType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Attribute;
