class ProductAttributeValue {
  constructor({
    pavId,
    productId,
    attributeId,
    value,
    attributeName,
    valueType
  }) {
    this.pavId = pavId;
    this.productId = productId;
    this.attributeId = attributeId;
    this.value = value;

    // JOIN từ bảng Attribute
    this.attributeName = attributeName;
    this.valueType = valueType;
  }
}

module.exports = ProductAttributeValue;
