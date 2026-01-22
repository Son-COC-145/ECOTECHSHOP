class Address {
  constructor({ addressId, userId, fullName, phone, province, district, ward, detail, isDefault, createdAt }) {
    this.addressId = addressId;
    this.userId = userId;
    this.fullName = fullName;
    this.phone = phone;
    this.province = province;
    this.district = district;
    this.ward = ward;
    this.detail = detail;
    this.isDefault = isDefault;
    this.createdAt = createdAt;
  }
}

module.exports = Address;
