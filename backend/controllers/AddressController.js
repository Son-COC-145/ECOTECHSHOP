const AddressService = require("../services/AddressService");

class AddressController {
  static async getAddresses(req, res) {
    try {
      const userId = req.user.id;
      const addresses = await AddressService.getByUser(userId);
      res.json({ success: true, addresses });
    } catch (err) {
      console.error("getAddresses error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  static async addAddress(req, res) {
    try {
      const userId = req.user.id;
      const { fullName, phone, province, district, ward, detail, isDefault } = req.body;

      if (!fullName || !phone || !province || !district || !ward || !detail)
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

      const normalizedPhone = String(phone).replace(/\D/g, "");
      if (!/^0\d{9}$/.test(normalizedPhone))
        return res.status(400).json({ message: "Số điện thoại không hợp lệ" });

      const newAddress = await AddressService.create(userId, {
        fullName, phone: normalizedPhone, province, district, ward, detail,
        isDefault: isDefault ? 1 : 0
      });

      res.status(201).json({ success: true, address: newAddress });
    } catch (err) {
      console.error("addAddress error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  static async updateAddress(req, res) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;
      const { fullName, phone, province, district, ward, detail, isDefault } = req.body;

      if (!fullName || !phone || !province || !district || !ward || !detail)
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

      const normalizedPhone = String(phone).replace(/\D/g, "");
      if (!/^0\d{9}$/.test(normalizedPhone))
        return res.status(400).json({ message: "Số điện thoại không hợp lệ" });

      await AddressService.update(addressId, userId, {
        fullName,
        phone: normalizedPhone,
        province,
        district,
        ward,
        detail,
        isDefault: isDefault ? 1 : 0
      });

      res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
      console.error("updateAddress error:", err);
      res.status(500).json({ message: "Lỗi server" });
    }
  }

  static async deleteAddress(req, res) {
    try {
      const userId = req.user.id;
      const { addressId } = req.params;

      await AddressService.delete(addressId, userId);
      res.json({ success: true, message: "Xóa thành công" });
    } catch (err) {
      console.error("deleteAddress error:", err);
      
      // Kiểm tra nếu lỗi do ràng buộc FOREIGN KEY hoặc do kiểm tra trong service
      if (err.message && err.message.includes("đang được sử dụng")) {
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }
      
      // Kiểm tra lỗi FOREIGN KEY constraint
      if (err.code === 'EREQUEST' && err.number === 547) {
        return res.status(400).json({ 
          success: false,
          message: "Không thể xóa địa chỉ này vì đang được sử dụng bởi một hoặc nhiều đơn hàng. Vui lòng xóa các đơn hàng liên quan trước." 
        });
      }
      
      res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
  }
}

module.exports = AddressController;