import React, { useState, useEffect } from "react";
import axios from "axios";
import addressApi from "../../services/addressApi";
import { useAuth } from "../../context/AuthContext";
import "../../styles/ShippingAddressForm.css";

function ShippingAddressForm({
  onAddressSelect,
  onAddressAdded,
  onClose,
  initialData,
  isAddingNew,
}) {
  const { user, logout } = useAuth();

  // Helper function để lấy token
  const getToken = () => user?.token || localStorage.getItem("token");

  const [formData, setFormData] = useState({
    province: "",
    district: "",
    ward: "",
    detail: "",
    fullName: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [loading, setLoading] = useState({
    provinces: false,
    districts: false,
    wards: false,
    form: false,
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);

  /* =====================================================
     1. LOAD ĐỊA CHỈ CỦA USER
  ===================================================== */
  useEffect(() => {
    const fetchAddresses = async () => {
      const token = getToken();
      if (!token) return;

      try {
        setLoading((prev) => ({ ...prev, form: true }));

        const addresses = await addressApi.getAddresses(token);
        setSavedAddresses(addresses);

        if (addresses.length > 0 && !initialData && !isAddingNew) {
          const defaultAddress = addresses[0];
          setSelectedAddressId(defaultAddress.addressId || defaultAddress._id);

          onAddressSelect({
            addressId: defaultAddress.addressId || defaultAddress._id,
            fullName: defaultAddress.fullName,
            phone: defaultAddress.phone,
            province: defaultAddress.province,
            district: defaultAddress.district,
            ward: defaultAddress.ward,
            detail: defaultAddress.detail,
            address: `${defaultAddress.detail}, ${defaultAddress.ward}, ${defaultAddress.district}, ${defaultAddress.province}`, // Giữ để tương thích
          });
        }
      } catch (error) {
        console.error("Lỗi lấy địa chỉ:", error);
      } finally {
        setLoading((prev) => ({ ...prev, form: false }));
      }
    };

    fetchAddresses();
  }, [user?.token, onAddressSelect, initialData, isAddingNew]);

  /* =====================================================
     2. FILL FORM KHI CÓ initialData (dùng cho edit từ ngoài)
  ===================================================== */
  useEffect(() => {
    if (initialData) {
      // Khi edit từ ngoài truyền vào, ta sẽ để startEditAddress xử lý mapping name -> code
      startEditAddress(initialData, true);
    } else {
      setFormData({
        province: "",
        district: "",
        ward: "",
        detail: "",
        fullName: "",
        phone: "",
      });
      setEditingAddress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  /* =====================================================
     3. LOAD DANH SÁCH TỈNH/THÀNH
  ===================================================== */
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setLoading((prev) => ({ ...prev, provinces: true }));
        const response = await axios.get(
          "https://provinces.open-api.vn/api/p/"
        );
        setProvinces(response.data || []);
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          form: "Không tải được tỉnh/thành phố.",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, provinces: false }));
      }
    };

    loadProvinces();
  }, []);

  /* =====================================================
     4. HÀM HỖ TRỢ: LOAD HUYỆN & XÃ THEO CODE
  ===================================================== */
  const loadDistrictsByProvince = async (provinceCode) => {
    if (!provinceCode) {
      setDistricts([]);
      setWards([]);
      return;
    }
    try {
      setLoading((prev) => ({ ...prev, districts: true }));
      const res = await axios.get(
        `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`
      );
      setDistricts(res.data.districts || []);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: "Không tải được quận/huyện.",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, districts: false }));
    }
  };

  const loadWardsByDistrict = async (districtCode) => {
    if (!districtCode) {
      setWards([]);
      return;
    }
    try {
      setLoading((prev) => ({ ...prev, wards: true }));
      const res = await axios.get(
        `https://provinces.open-api.vn/api/d/${districtCode}?depth=2`
      );
      setWards(res.data.wards || []);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: "Không tải được phường/xã.",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, wards: false }));
    }
  };

  /* =====================================================
     5. VALIDATE
  ===================================================== */
  const validate = (data) => {
    const errors = {};
    if (!data.fullName.trim()) errors.fullName = "Họ và tên không được trống.";
    else if (/\d/.test(data.fullName))
      errors.fullName = "Tên không được chứa số";

    const phoneRegex = /^0\d{9}$/;
    if (!data.phone) errors.phone = "Không được trống.";
    else if (!phoneRegex.test(data.phone))
      errors.phone = "SĐT phải 10 số và bắt đầu bằng 0";

    if (!data.province) errors.province = "Chọn tỉnh";
    if (!data.district) errors.district = "Chọn huyện";
    if (!data.ward) errors.ward = "Chọn xã";
    if (!data.detail.trim()) errors.detail = "Nhập địa chỉ chi tiết";

    return errors;
  };

  const handleInputChange = (field, value) => {
    const newData = { ...formData, [field]: value };

    // reset cấp dưới khi đổi tỉnh / huyện
    if (field === "province") {
      newData.district = "";
      newData.ward = "";
    } else if (field === "district") {
      newData.ward = "";
    }

    setFormData(newData);
    setErrors(validate(newData));

    if (field === "province") {
      loadDistrictsByProvince(value);
      setWards([]);
    } else if (field === "district") {
      loadWardsByDistrict(value);
    }
  };

  /* =====================================================
     6. CHỌN ĐỊA CHỈ ĐÃ LƯU
  ===================================================== */
  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.addressId || address._id);

    onAddressSelect({
      addressId: address.addressId || address._id,
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detail: address.detail,
      address: `${address.detail}, ${address.ward}, ${address.district}, ${address.province}`, // Giữ để tương thích
    });

    onClose();
  };

  /* =====================================================
     7. XÓA ĐỊA CHỈ
  ===================================================== */
  const handleDeleteAddress = async (addressId) => {
    try {
      setLoading((prev) => ({ ...prev, form: true }));

      const token = getToken();
      await addressApi.deleteAddress(addressId, token);

      const updated = await addressApi.getAddresses(token);
      setSavedAddresses(updated);
      setShowDeleteConfirm(null);

      if (selectedAddressId === addressId && updated.length > 0) {
        handleSelectAddress(updated[0]);
      } else if (updated.length === 0) {
        setSelectedAddressId(null);
      }
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading((prev) => ({ ...prev, form: false }));
    }
  };

  /* =====================================================
     8. BẮT ĐẦU SỬA MỘT ĐỊA CHỈ
     - Map tên -> code để select hiển thị đúng
  ===================================================== */
  const startEditAddress = async (address, fromInitialData = false) => {
    try {
      setEditingAddress(address);

      // Tìm mã tỉnh theo tên
      const provinceObj = provinces.find(
        (p) => p.name === address.province
      );
      const provinceCode = provinceObj ? String(provinceObj.code) : "";

      let districtCode = "";
      let wardCode = "";

      if (provinceCode) {
        await loadDistrictsByProvince(provinceCode);

        // Sau khi có districts trong state, lấy luôn local (async trên kia đã chạy xong)
        const resDistricts = await axios.get(
          `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`
        );
        const districtList = resDistricts.data.districts || [];

        const districtObj = districtList.find(
          (d) => d.name === address.district
        );
        districtCode = districtObj ? String(districtObj.code) : "";

        if (districtCode) {
          await loadWardsByDistrict(districtCode);

          const resWards = await axios.get(
            `https://provinces.open-api.vn/api/d/${districtCode}?depth=2`
          );
          const wardList = resWards.data.wards || [];

          const wardObj = wardList.find((w) => w.name === address.ward);
          wardCode = wardObj ? String(wardObj.code) : "";
        }
      }

      setFormData({
        province: provinceCode,
        district: districtCode,
        ward: wardCode,
        detail: address.detail || "",
        fullName: address.fullName || "",
        phone: address.phone || "",
      });

      if (!fromInitialData) {
        setSelectedAddressId(address.addressId);
      }
    } catch (err) {
      console.error("Lỗi khi chuẩn bị dữ liệu sửa địa chỉ:", err);
      setErrors((prev) => ({
        ...prev,
        form: "Không tải được dữ liệu địa chỉ để sửa.",
      }));
    }
  };

  /* =====================================================
     9. SUBMIT (THÊM / SỬA)
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate(formData);
    if (Object.keys(errs).length > 0) return setErrors(errs);

    const provinceName = provinces.find(
      (p) => p.code === Number(formData.province)
    )?.name;
    const districtName = districts.find(
      (d) => d.code === Number(formData.district)
    )?.name;
    const wardName = wards.find(
      (w) => w.code === Number(formData.ward)
    )?.name;

    const data = {
      fullName: formData.fullName,
      phone: formData.phone,
      province: provinceName,
      district: districtName,
      ward: wardName,
      detail: formData.detail,
    };

    try {
      setLoading((prev) => ({ ...prev, form: true }));

      let result;
      let currentId = null;
      const token = getToken();

      if (editingAddress || initialData) {
        const id = editingAddress?.addressId || initialData?.addressId;
        await addressApi.updateAddress(id, data, token);
        currentId = id;
      } else {
        result = await addressApi.addAddress(data, token);
        currentId = result?.addressId;
        if (onAddressAdded) onAddressAdded(result);
      }

      const refreshed = await addressApi.getAddresses(token);
      setSavedAddresses(refreshed);

      const selected =
        refreshed.find((a) => a.addressId === currentId) || refreshed[0];

      if (selected && onAddressSelect) {
        onAddressSelect({
          addressId: selected.addressId || selected._id,
          fullName: selected.fullName,
          phone: selected.phone,
          province: selected.province,
          district: selected.district,
          ward: selected.ward,
          detail: selected.detail,
          address: `${selected.detail}, ${selected.ward}, ${selected.district}, ${selected.province}`, // Giữ để tương thích
        });
      }

      setFormData({
        province: "",
        district: "",
        ward: "",
        detail: "",
        fullName: "",
        phone: "",
      });
      setEditingAddress(null);
      setDistricts([]);
      setWards([]);

      onClose();
    } catch (err) {
      setErrors({ form: err.message });
      if (err.response?.status === 401) logout();
    } finally {
      setLoading((prev) => ({ ...prev, form: false }));
    }
  };

  /* =====================================================
     10. CHƯA LOGIN
  ===================================================== */
  if (!user?.token) {
    return (
      <div className="shipping-address-modal" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Địa chỉ giao hàng</h3>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <p className="form-error">
              Vui lòng đăng nhập để quản lý địa chỉ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     11. UI CHÍNH
  ===================================================== */
  return (
    <div className="shipping-address-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Quản lý địa chỉ giao hàng</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {(loading.provinces ||
            loading.districts ||
            loading.wards ||
            loading.form) && (
            <div className="loading-overlay loading">
              <p>Đang tải...</p>
            </div>
          )}

          {/* Danh sách địa chỉ đã lưu */}
          {savedAddresses.length > 0 && !isAddingNew && (
            <div className="saved-addresses-section">
              <h4>Địa chỉ đã lưu</h4>
              <div className="saved-addresses">
                {savedAddresses.map((address) => (
                  <div
                    key={address.addressId}
                    className={`address-item ${
                      selectedAddressId === address.addressId ? "selected" : ""
                    }`}
                  >
                    <div
                      className="address-content"
                      onClick={() => handleSelectAddress(address)}
                    >
                      <p>
                        <strong>{address.fullName}</strong> ({address.phone})
                      </p>
                      <p>{`${address.detail}, ${address.ward}, ${address.district}, ${address.province}`}</p>
                    </div>

                    <div className="address-actions">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => startEditAddress(address)}
                        disabled={loading.form}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() =>
                          setShowDeleteConfirm(address.addressId)
                        }
                        disabled={loading.form}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form nhập / sửa địa chỉ */}
          <div className="form-section">
            <h4>
              {editingAddress || initialData
                ? "Cập nhật địa chỉ"
                : "Thêm địa chỉ mới"}
            </h4>

            <form onSubmit={handleSubmit} className="address-form">
              {/* Họ tên - SĐT */}
              <div className="form-row">
                <div className="form-group">
                  <label>Họ và tên:</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      handleInputChange("fullName", e.target.value)
                    }
                    className={errors.fullName ? "input-error" : ""}
                  />
                  {errors.fullName && (
                    <p className="error-message">{errors.fullName}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Số điện thoại:</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      handleInputChange("phone", e.target.value)
                    }
                    className={errors.phone ? "input-error" : ""}
                  />
                  {errors.phone && (
                    <p className="error-message">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Tỉnh - Huyện */}
              <div className="form-row">
                <div className="form-group">
                  <label>Tỉnh/Thành phố:</label>
                  <select
                    value={formData.province}
                    onChange={(e) =>
                      handleInputChange("province", e.target.value)
                    }
                    className={errors.province ? "input-error" : ""}
                  >
                    <option value="">-- Chọn --</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.province && (
                    <p className="error-message">{errors.province}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Quận/Huyện:</label>
                  <select
                    value={formData.district}
                    onChange={(e) =>
                      handleInputChange("district", e.target.value)
                    }
                    disabled={!formData.province}
                    className={errors.district ? "input-error" : ""}
                  >
                    <option value="">-- Chọn --</option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="error-message">{errors.district}</p>
                  )}
                </div>
              </div>

              {/* Xã - Chi tiết */}
              <div className="form-row">
                <div className="form-group">
                  <label>Phường/Xã:</label>
                  <select
                    value={formData.ward}
                    onChange={(e) =>
                      handleInputChange("ward", e.target.value)
                    }
                    disabled={!formData.district}
                    className={errors.ward ? "input-error" : ""}
                  >
                    <option value="">-- Chọn --</option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {errors.ward && (
                    <p className="error-message">{errors.ward}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Địa chỉ chi tiết:</label>
                  <input
                    type="text"
                    value={formData.detail}
                    onChange={(e) =>
                      handleInputChange("detail", e.target.value)
                    }
                    className={errors.detail ? "input-error" : ""}
                    placeholder="Số nhà, đường..."
                  />
                  {errors.detail && (
                    <p className="error-message">{errors.detail}</p>
                  )}
                </div>
              </div>

              {errors.form && <p className="form-error">{errors.form}</p>}

              <div className="form-buttons">
                <button className="submit-btn" disabled={loading.form}>
                  {loading.form
                    ? "Đang lưu..."
                    : editingAddress || initialData
                    ? "Cập nhật"
                    : "Thêm mới"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={onClose}
                  disabled={loading.form}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>

          {/* Confirm xóa */}
          {showDeleteConfirm && (
            <div className="confirm-modal">
              <div className="confirm-content">
                <h4>Xác nhận xóa</h4>
                <p>Bạn có chắc muốn xóa địa chỉ này?</p>

                <div className="confirm-buttons">
                  <button
                    className="confirm-delete-btn"
                    onClick={() => handleDeleteAddress(showDeleteConfirm)}
                  >
                    Xóa
                  </button>
                  <button
                    className="cancel-delete-btn"
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShippingAddressForm;