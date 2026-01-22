const AddressDAO = require("../dao/AddressDAO");
const Address = require("../models/Address");

class AddressService {
  async getByUser(userId) {
    const result = await AddressDAO.getByUser(userId);
    const rows = Array.isArray(result) ? result : (result?.recordset || []);
    return rows.map((row) => new Address(row));
  }

  async create(userId, data) {
    if (data.isDefault) {
      await AddressDAO.clearDefault(userId);
    }

    const row = await AddressDAO.create({ userId, ...data });
    return new Address(row);
  }

  async update(addressId, userId, data) {
    if (data.isDefault) {
      await AddressDAO.clearDefault(userId);
    }

    await AddressDAO.update(addressId, userId, data);
    return true;
  }

  async delete(addressId, userId) {
    // Không cho phép xóa địa chỉ nếu đã được sử dụng bởi đơn hàng
    // Vì cột addressId trong Orders không cho phép NULL
    // Nếu muốn cho phép xóa, cần sửa database schema để cho phép NULL
    const isUsed = await AddressDAO.isUsedByOrders(addressId);
    if (isUsed) {
      throw new Error("Không thể xóa địa chỉ này vì đang được sử dụng bởi một hoặc nhiều đơn hàng. Vui lòng liên hệ hỗ trợ nếu cần xóa.");
    }

    await AddressDAO.delete(addressId, userId);
    return true;
  }
}

module.exports = new AddressService();