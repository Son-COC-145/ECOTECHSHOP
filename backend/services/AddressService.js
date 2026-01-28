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
    // Sử dụng soft delete để không ảnh hưởng đến đơn hàng đã tạo
    // Địa chỉ sẽ được ẩn khỏi danh sách nhưng vẫn còn trong database
    await AddressDAO.delete(addressId, userId);
    return true;
  }

  async hardDelete(addressId, userId) {
    // Hard delete - chỉ dùng khi địa chỉ chưa được sử dụng
    const isUsed = await AddressDAO.isUsedByOrders(addressId);
    if (isUsed) {
      throw new Error("Không thể xóa vĩnh viễn địa chỉ này vì đang được sử dụng bởi đơn hàng.");
    }
    await AddressDAO.hardDelete(addressId, userId);
    return true;
  }

  async restore(addressId, userId) {
    await AddressDAO.restore(addressId, userId);
    return true;
  }
}

module.exports = new AddressService();