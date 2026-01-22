import { useState, useEffect, useMemo } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";
import { getCategories } from "../services/categoryService";
import api from "../services/api";
import { uploadImage, deleteImage } from "../services/uploadService";
import AdminSidebar from "../components/AdminSidebar";
import "../styles/ProductList.css";
import "../styles/admin-dashboard.css";

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ✅ Filter 2 tầng
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedChild, setSelectedChild] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    image: "",
    images: [], // ✅ Array các object { imageUrl: "", optionName: "" }
    categoryId: "",
    prices: {},
    stock: 0,
  });

  const [priceList, setPriceList] = useState([{ key: "", value: 0 }]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({});
  
  // State cho form category (riêng với filter)
  const [formParentCategory, setFormParentCategory] = useState("");
  const [formChildCategory, setFormChildCategory] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    setSelectedChild("");
  }, [selectedParent]);

  // Reset child khi đổi parent trong form
  useEffect(() => {
    setFormChildCategory("");
    setFormData(prev => ({ ...prev, categoryId: "" }));
  }, [formParentCategory]);

  // Khi chọn child category, set categoryId
  useEffect(() => {
    if (formChildCategory) {
      setFormData(prev => ({ ...prev, categoryId: formChildCategory }));
    }
  }, [formChildCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      alert(
        "Lỗi khi tải danh sách sản phẩm: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories || data || []);
    } catch (error) {
      console.error("Lỗi khi lấy danh mục:", error);
    }
  };

  // ---------- Helpers ----------
  const getCategoryIdValue = (cat) => String(cat?.categoryId ?? cat?._id ?? "");

  const getProductCategoryId = (product) => {
    const v =
      product?.categoryId?.categoryId ??
      product?.categoryId?._id ??
      product?.categoryId;
    return v == null ? "" : String(v);
  };

  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId == null),
    [categories]
  );

  const childCategories = useMemo(() => {
    if (!selectedParent) return [];
    return categories.filter(
      (c) => String(c.parentId) === String(selectedParent)
    );
  }, [categories, selectedParent]);

  // Form categories
  const formParentCategories = useMemo(
    () => categories.filter((c) => c.parentId == null),
    [categories]
  );

  const formChildCategories = useMemo(() => {
    if (!formParentCategory) return [];
    return categories.filter(
      (c) => String(c.parentId) === String(formParentCategory)
    );
  }, [categories, formParentCategory]);

  const filteredProducts = useMemo(() => {
    if (!selectedParent && !selectedChild) return products;

    if (selectedChild) {
      const childId = String(selectedChild);
      return products.filter((p) => getProductCategoryId(p) === childId);
    }

    const parentId = String(selectedParent);
    const childIds = new Set(
      categories
        .filter((c) => String(c.parentId) === parentId)
        .map((c) => getCategoryIdValue(c))
        .filter(Boolean)
    );

    return products.filter((p) => childIds.has(getProductCategoryId(p)));
  }, [products, categories, selectedParent, selectedChild]);

  const renderPrices = (product) => {
    const list = product?.pricesList;
    if (Array.isArray(list) && list.length > 0) {
      return list.map((p) => (
        <span
          key={p.priceId || `${p.optionName}-${p.optionPrice}`}
          className="price-item"
        >
          {p.optionName}: {Number(p.optionPrice).toLocaleString("vi-VN")}₫
        </span>
      ));
    }

    const obj = product?.prices;
    if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
      return Object.entries(obj).map(([k, v]) => (
        <span key={k} className="price-item">
          {k}: {Number(v).toLocaleString("vi-VN")}₫
        </span>
      ));
    }

    return <span className="no-price">Chưa có giá</span>;
  };

  // ---------- CRUD ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!formParentCategory || !formChildCategory) {
      alert("Vui lòng chọn đầy đủ danh mục chính và hãng");
      return;
    }
    // ✅ Kiểm tra ít nhất 1 ảnh
    const validImages = formData.images.filter((img) => img.imageUrl && img.imageUrl.trim());
    if (validImages.length === 0 && !formData.image.trim()) {
      alert("Vui lòng thêm ít nhất một hình ảnh");
      return;
    }
    if (formData.stock < 0) {
      alert("Số lượng tồn kho phải >= 0");
      return;
    }

    const prices = {};
    priceList.forEach((item) => {
      if (
        item.key &&
        item.value !== null &&
        item.value !== undefined &&
        item.value !== ""
      ) {
        prices[item.key] = Number(item.value);
      }
    });

    try {
      setLoading(true);
      
      // ✅ Lấy ảnh đầu tiên làm ảnh chính (backward compatibility)
      const mainImage = validImages.length > 0 
        ? validImages[0].imageUrl.trim()
        : formData.image.trim();

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: mainImage,
        categoryId: formData.categoryId,
        prices,
        stock: Number(formData.stock) || 0,
      };

      let productId;
      if (isEditing && formData.id) {
        await updateProduct(formData.id, productData);
        productId = formData.id;
        
        // ✅ Khi edit: Xóa ảnh cũ và thêm ảnh mới
        // Lấy danh sách ảnh hiện có
        try {
          const existingImagesRes = await api.get(`/api/product-images/${productId}`);
          const existingImages = existingImagesRes.data?.images || [];
          
          // Xóa tất cả ảnh cũ
          for (const img of existingImages) {
            try {
              await api.delete(`/api/product-images/${img.imageId || img._id}`);
            } catch (err) {
              console.error("Lỗi khi xóa ảnh cũ:", err);
            }
          }
        } catch (err) {
          console.error("Lỗi khi load ảnh cũ:", err);
        }
      } else {
        const result = await addProduct(productData);
        console.log("Add product response (full):", result);
        console.log("Add product response type:", typeof result);
        console.log("Add product response keys:", Object.keys(result || {}));
        
        // Thử nhiều cách để lấy productId
        productId = result?.productId || result?._id || result?.id || result?.product?.productId || result?.data?.productId;
        
        console.log("Extracted productId:", productId, "Type:", typeof productId);
        
        // Validate productId
        if (!productId && productId !== 0) {
          console.error("Không thể lấy productId từ response. Full response:", JSON.stringify(result, null, 2));
          
          // Thử lấy productId từ danh sách sản phẩm mới nhất (fallback)
          try {
            const allProducts = await getProducts();
            const productsList = allProducts.products || allProducts || [];
            if (productsList.length > 0) {
              const latestProduct = productsList[0]; // Sắp xếp DESC nên sản phẩm mới nhất ở đầu
              const fallbackProductId = latestProduct.productId || latestProduct._id;
              if (fallbackProductId && latestProduct.name === productData.name) {
                console.log("Using fallback productId:", fallbackProductId);
                productId = fallbackProductId;
              }
            }
          } catch (fallbackError) {
            console.error("Fallback failed:", fallbackError);
          }
          
          if (!productId && productId !== 0) {
            throw new Error("Không thể lấy productId sau khi tạo sản phẩm. Response: " + JSON.stringify(result));
          }
        }

        console.log("Final productId to use:", productId);

        // ✅ Thêm giá vào ProductPrice
        if (Object.keys(prices).length > 0 && productId) {
          console.log("Adding prices for productId:", productId);
          await addProductPrices(productId, prices);
        } else {
          console.log("Skipping price addition - prices:", Object.keys(prices).length, "productId:", productId);
        }
      }

      // ✅ Thêm các ảnh vào ProductImages
      if (validImages.length > 0 && productId) {
        await addProductImages(productId, validImages);
      }

      await fetchProducts();
      handleCloseModal();
      alert(isEditing ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      setLoading(true);
      await deleteProduct(id);
      alert("Xóa sản phẩm thành công!");
      setProducts((prev) => prev.filter((p) => (p.productId || p._id) !== id));
    } catch (error) {
      alert(
        "Lỗi khi xóa sản phẩm: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (product) => {
    const priceArr =
      Array.isArray(product?.pricesList) && product.pricesList.length
        ? product.pricesList.map((p) => ({
            key: p.optionName || "",
            value: Number(p.optionPrice) || 0,
          }))
        : Object.entries(product?.prices || {}).map(([key, value]) => ({
            key,
            value: Number(value) || 0,
          }));

    // ✅ Load ảnh từ API
    let productImages = [];
    try {
      const productId = product.productId || product._id;
      console.log("Loading images for productId:", productId);
      const response = await api.get(`/api/product-images/${productId}`);
      console.log("Product images response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data.images)) {
        productImages = response.data.images;
        console.log("Loaded images:", productImages);
      } else if (Array.isArray(response.data)) {
        productImages = response.data;
      } else {
        console.warn("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Lỗi khi load ảnh:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Nếu không load được ảnh từ API, vẫn tiếp tục với ảnh chính
    }

    // ✅ Map ảnh từ API, đảm bảo có ít nhất 1 field
    let mappedImages = [];
    if (productImages.length > 0) {
      mappedImages = productImages.map((img) => ({
        imageUrl: img.imageUrl || img.url || img.image || "",
        optionName: img.color || img.optionName || img.option || "",
      })).filter(img => img.imageUrl); // Loại bỏ ảnh không có URL
    }
    
    // Nếu không có ảnh từ API nhưng có ảnh chính, thêm vào
    if (mappedImages.length === 0 && product.image) {
      mappedImages = [{ imageUrl: product.image, optionName: "" }];
    }
    
    // Đảm bảo luôn có ít nhất 1 field
    if (mappedImages.length === 0) {
      mappedImages = [{ imageUrl: "", optionName: "" }];
    }

    console.log("Final mapped images:", mappedImages);

    const currentCategoryId = product.categoryId?._id || product.categoryId || "";
    
    // Tìm parent category từ categoryId
    let parentId = "";
    if (currentCategoryId) {
      const currentCat = categories.find(c => 
        String(c.categoryId || c._id) === String(currentCategoryId)
      );
      if (currentCat && currentCat.parentId) {
        parentId = String(currentCat.parentId);
      }
    }
    
    setFormParentCategory(parentId);
    setFormChildCategory(currentCategoryId);

    setFormData({
      id: product.productId || product._id,
      name: product.name || "",
      description: product.description || "",
      image: product.image || "",
      images: mappedImages,
      categoryId: currentCategoryId,
      prices: product.prices || {},
      stock: product.stock || 0,
    });

    setPriceList(priceArr.length ? priceArr : [{ key: "", value: 0 }]);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
    setIsEditing(false);
  };

  const resetForm = () => {
    setFormParentCategory("");
    setFormChildCategory("");
    setFormData({
      id: "",
      name: "",
      description: "",
      image: "",
      images: [{ imageUrl: "", optionName: "", publicId: "" }], // ✅ Bắt đầu với 1 field trống
      categoryId: "",
      prices: {},
      stock: 0,
    });
    setPriceList([{ key: "", value: 0 }]);
  };

  // ✅ Hàm quản lý danh sách ảnh
  const handleImageChange = (index, field, value) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      newImages[index] = {
        ...newImages[index],
        [field]: value,
      };
      return { ...prev, images: newImages };
    });
  };

  const addImageField = () => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, { imageUrl: "", optionName: "", publicId: "" }],
    }));
  };

  const removeImageField = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Hàm xử lý upload ảnh lên Cloudinary
  const handleImageUpload = async (index, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [index]: true }));

    try {
      const result = await uploadImage(file);
      
      handleImageChange(index, 'imageUrl', result.imageUrl);
      handleImageChange(index, 'publicId', result.publicId); // Lưu publicId để xóa sau
      
      alert('Upload ảnh thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi khi upload ảnh: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  // Hàm xóa ảnh từ Cloudinary
  const handleImageDeleteFromCloudinary = async (index) => {
    const image = formData.images[index];
    if (image.publicId) {
      try {
        await deleteImage(image.publicId);
      } catch (error) {
        console.error('Delete error:', error);
        // Không hiển thị lỗi nếu không xóa được (có thể ảnh đã bị xóa rồi)
      }
    }
    removeImageField(index);
  };

  // ✅ Hàm thêm ảnh vào backend sau khi tạo sản phẩm
  const addProductImages = async (productId, images) => {
    try {
      const promises = images
        .filter((img) => img.imageUrl && img.imageUrl.trim())
        .map((img) =>
          api.post("/api/product-images", {
            productId,
            imageUrl: img.imageUrl.trim(),
            color: img.optionName?.trim() || null, // Gửi optionName vào field color
          })
        );
      await Promise.all(promises);
    } catch (error) {
      console.error("Lỗi khi thêm ảnh:", error);
      throw error;
    }
  };

  // ✅ Hàm thêm giá vào backend sau khi tạo/sửa sản phẩm
  const addProductPrices = async (productId, prices) => {
    try {
      console.log("addProductPrices - Called with productId:", productId, "prices:", prices);
      
      if (!productId) {
        throw new Error("productId không hợp lệ khi thêm giá");
      }
      
      const priceEntries = Object.entries(prices || {});
      if (priceEntries.length === 0) {
        console.log("addProductPrices - No prices to add");
        return;
      }

      console.log("addProductPrices - Price entries:", priceEntries);

      const validEntries = priceEntries.filter(
        ([optionName, optionPrice]) => optionName && optionName.trim() && optionPrice != null && optionPrice !== ""
      );
      
      console.log("addProductPrices - Valid entries:", validEntries);

      if (validEntries.length === 0) {
        console.log("addProductPrices - No valid prices to add");
        return;
      }

      const promises = validEntries.map(([optionName, optionPrice]) => {
        const payload = {
          productId: Number(productId),
          optionName: optionName.trim(),
          optionPrice: Number(optionPrice),
        };
        console.log("addProductPrices - Adding price:", payload);
        return api.post("/api/prices", payload);
      });
      
      const results = await Promise.all(promises);
      console.log("addProductPrices - All prices added successfully:", results);
    } catch (error) {
      console.error("Lỗi khi thêm giá:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  const handlePriceChange = (index, field, value) => {
    setPriceList((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const addPriceField = () => {
    setPriceList((prev) => [...prev, { key: "", value: 0 }]);
  };

  const removePriceField = (index) => {
    setPriceList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length ? updated : [{ key: "", value: 0 }];
    });
  };

  const PencilIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );

  const TrashIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );

  return (
    <div className="admin-dashboard-layout">
      <AdminSidebar />
      <main className="admin-main-content">
        <div className="product-management-container-inline">
      <div className="product-management-header">
        <h1>Quản Lý Sản Phẩm</h1>
        <button
          onClick={handleAddNew}
          className="btn-add-product"
          disabled={loading}
        >
          + Thêm Sản Phẩm Mới
        </button>
      </div>

      {/* ✅ FILTERS 2 TẦNG */}
      <div className="product-filters">
        <div className="filter-item">
          <label>Danh mục chính</label>
          <select
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
          >
            <option value="">Tất cả</option>
            {parentCategories.map((cat) => (
              <option
                key={cat.categoryId || cat._id}
                value={cat.categoryId || cat._id}
              >
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Hãng</label>
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            disabled={!selectedParent}
          >
            <option value="">Tất cả</option>
            {childCategories.map((cat) => (
              <option
                key={cat.categoryId || cat._id}
                value={cat.categoryId || cat._id}
              >
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-clear-filters"
          onClick={() => {
            setSelectedParent("");
            setSelectedChild("");
          }}
          disabled={!selectedParent && !selectedChild}
        >
          Xóa lọc
        </button>
      </div>

      <div className="product-list">
        {loading && products.length === 0 ? (
          <div className="loading-state">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên Sản Phẩm</th>
                <th>Danh Mục</th>
                <th>Giá</th>
                <th>Tồn Kho</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <p>Không có sản phẩm phù hợp bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.productId || product._id}>
                    <td>
                      <img
                        src={product.image || "/placeholder.png"}
                        alt={product.name}
                        className="product-image"
                        onError={(e) => {
                          e.target.src = "/placeholder.png";
                        }}
                      />
                    </td>
                    <td className="product-name">{product.name}</td>
                    <td>
                      {product.categoryId?.name ||
                        product.categoryName ||
                        "N/A"}
                    </td>
                    <td className="product-price">{renderPrices(product)}</td>
                    <td className="product-stock">{product.stock || 0}</td>
                    <td className="action-buttons">
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn-edit"
                        disabled={loading}
                        title="Chỉnh sửa"
                      >
                        <PencilIcon />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(product.productId || product._id)
                        }
                        className="btn-delete"
                        disabled={loading}
                        title="Xóa"
                      >
                        <TrashIcon />
                        <span>Xóa</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="product-form-modal">
              <div className="form-two-columns">
                {/* Cột trái - Thông tin cơ bản */}
                <div className="form-column form-column-left">
                  <div className="form-group">
                    <label htmlFor="name">
                      Tên sản phẩm <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="Nhập tên sản phẩm"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Danh mục chính <span className="required">*</span>
                    </label>
                    <select
                      value={formParentCategory}
                      onChange={(e) => setFormParentCategory(e.target.value)}
                      required
                    >
                      <option value="">Chọn danh mục chính</option>
                      {formParentCategories.map((cat) => (
                        <option
                          key={cat.categoryId || cat._id}
                          value={cat.categoryId || cat._id}
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Hãng <span className="required">*</span>
                    </label>
                    <select
                      value={formChildCategory}
                      onChange={(e) => setFormChildCategory(e.target.value)}
                      disabled={!formParentCategory}
                      required
                    >
                      <option value="">Chọn hãng</option>
                      {formChildCategories.map((cat) => (
                        <option
                          key={cat.categoryId || cat._id}
                          value={cat.categoryId || cat._id}
                        >
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Mô tả</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows="5"
                      placeholder="Nhập mô tả sản phẩm"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stock">
                      Số lượng tồn kho <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="stock"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: Number(e.target.value) })
                      }
                      required
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Cột phải - Hình ảnh & Giá */}
                <div className="form-column form-column-right">
                  <div className="form-group">
                    <label>
                      Hình ảnh sản phẩm <span className="required">*</span>
                    </label>
                    <div className="images-list-container">
                      {formData.images.map((image, index) => (
                        <div key={index} className="image-card">
                          {/* Preview ảnh */}
                          <div className="image-card-preview">
                            {image.imageUrl ? (
                              <img
                                src={image.imageUrl}
                                alt={`Preview ${index + 1}`}
                                className="image-preview-card"
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23f3f4f6" width="150" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="Arial" font-size="14"%3ELỗi ảnh%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="image-placeholder">
                                <span>📷</span>
                                <span>Chưa có ảnh</span>
                              </div>
                            )}
                            {image.imageUrl && (
                              <button
                                type="button"
                                onClick={() => handleImageDeleteFromCloudinary(index)}
                                className="btn-remove-image-card"
                                disabled={formData.images.length === 1}
                                title="Xóa ảnh"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          
                          {/* Thông tin và controls */}
                          <div className="image-card-content">
                            <div className="image-card-field">
                              <label>Tên option {index + 1}</label>
                              <input
                                type="text"
                                placeholder="VD: Màu đỏ, Góc nhìn 1"
                                value={image.optionName || ""}
                                onChange={(e) => handleImageChange(index, "optionName", e.target.value)}
                                className="image-option-input-card"
                              />
                            </div>
                            
                            <div className="image-card-field">
                              <label>Ảnh sản phẩm</label>
                              <div className="image-file-input-wrapper-card">
                                <input
                                  type="file"
                                  id={`file-input-${index}`}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleImageUpload(index, file);
                                    e.target.value = '';
                                  }}
                                  className="image-file-input-hidden"
                                  disabled={uploading[index]}
                                />
                                <label 
                                  htmlFor={`file-input-${index}`}
                                  className="btn-upload-image-card"
                                  style={{ 
                                    cursor: uploading[index] ? 'not-allowed' : 'pointer',
                                    pointerEvents: uploading[index] ? 'none' : 'auto'
                                  }}
                                >
                                  {uploading[index] ? (
                                    <>⏳ Đang upload...</>
                                  ) : image.imageUrl ? (
                                    <>📷 Thay đổi ảnh</>
                                  ) : (
                                    <>📁 Chọn ảnh</>
                                  )}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addImageField}
                        className="btn-add-image"
                      >
                        + Thêm ảnh
                      </button>
                    </div>
                    <p className="form-hint">
                      Có thể thêm nhiều ảnh cho sản phẩm. Ảnh đầu tiên sẽ là ảnh chính. Tên option giúp phân biệt các ảnh (VD: Màu đỏ, Góc nhìn 1, v.v.).
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Giá sản phẩm</label>
                    <div className="price-list-container">
                      {priceList.map((price, index) => (
                        <div key={index} className="price-item-row">
                          <input
                            type="text"
                            placeholder="Tùy chọn (VD: i7/16/512, 250g, M, L)"
                            value={price.key}
                            onChange={(e) =>
                              handlePriceChange(index, "key", e.target.value)
                            }
                            className="price-key"
                          />
                          <input
                            type="number"
                            placeholder="Giá (VNĐ)"
                            value={price.value}
                            onChange={(e) =>
                              handlePriceChange(index, "value", e.target.value)
                            }
                            min="0"
                            className="price-value"
                          />
                          <button
                            type="button"
                            onClick={() => removePriceField(index)}
                            className="btn-remove-price"
                            disabled={priceList.length === 1}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addPriceField}
                        className="btn-add-price"
                      >
                        + Thêm giá
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-cancel"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading
                    ? "Đang xử lý..." 
                    : isEditing
                    ? "Cập nhật"
                    : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default ProductsPage;