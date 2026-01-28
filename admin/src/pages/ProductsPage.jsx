import { useState, useEffect, useMemo } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
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

  // Filter 2 tầng
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedChild, setSelectedChild] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    image: "",
    images: [],
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

  // ✅ QUAN TRỌNG: Reset child category trong form CHỈ KHI thêm mới (không edit)
  useEffect(() => {
    if (!isEditing && formParentCategory) {
      setFormChildCategory("");
      setFormData(prev => ({ ...prev, categoryId: "" }));
    }
  }, [formParentCategory, isEditing]);

  // Khi chọn child category trong form, set categoryId
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
      alert("Lỗi khi tải danh sách sản phẩm: " + (error.response?.data?.message || error.message));
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
  const getProductCategoryId = (p) => String(p?.categoryId?._id ?? p?.categoryId ?? "");

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const childCategories = useMemo(() => {
    if (!selectedParent) return [];
    return categories.filter((c) => String(c.parentId) === String(selectedParent));
  }, [categories, selectedParent]);

  // Form categories (riêng biệt với filter)
  const formParentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const formChildCategories = useMemo(() => {
    if (!formParentCategory) return [];
    return categories.filter((c) => String(c.parentId) === String(formParentCategory));
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
          {p.optionName || '(Mặc định)'}: {Number(p.optionPrice).toLocaleString("vi-VN")}₫
        </span>
      ));
    }

    const obj = product?.prices;
    if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
      return Object.entries(obj).map(([k, v]) => (
        <span key={k} className="price-item">
          {k || '(Mặc định)'}: {Number(v).toLocaleString("vi-VN")}₫
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
    
    const validImages = formData.images.filter((img) => img.imageUrl && img.imageUrl.trim());
    if (validImages.length === 0 && !formData.image.trim()) {
      alert("Vui lòng thêm ít nhất một hình ảnh");
      return;
    }
    
    if (formData.stock < 0) {
      alert("Số lượng tồn kho phải >= 0");
      return;
    }

    // ✅ Convert priceList thành prices object
    const prices = {};
    priceList.forEach((item, index) => {
      const value = item.value;
      if (value !== null && value !== undefined && value !== "" && !isNaN(Number(value))) {
        // Giữ key rỗng để tạo giá mặc định, hoặc dùng key đã nhập
        const key = (item.key || "").trim();
        // Nếu key rỗng và đã tồn tại key rỗng -> thêm index để tránh ghi đè
        const finalKey = (key === "" && prices[""] !== undefined) ? `option_${index}` : key;
        prices[finalKey] = Number(value);
      }
    });

    console.log("========== SUBMIT DEBUG ==========");
    console.log("priceList:", priceList);
    console.log("prices object:", prices);
    console.log("isEditing:", isEditing);
    console.log("==================================");

    try {
      setLoading(true);
      
      const mainImage = validImages.length > 0 
        ? validImages[0].imageUrl.trim()
        : formData.image.trim();

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: mainImage,
        categoryId: formChildCategory,
        prices,
        stock: Number(formData.stock) || 0,
      };

      console.log("Product data to send:", productData);

      let productId;

      if (isEditing && formData.id) {
        // UPDATE
        console.log("Updating product:", formData.id);
        await updateProduct(formData.id, productData);
        productId = formData.id;
        
        // Xóa và thêm lại ảnh
        try {
          const existingImagesRes = await api.get(`/api/product-images/${productId}`);
          const existingImages = existingImagesRes.data?.images || [];
          
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
        // CREATE
        const result = await addProduct(productData);
        console.log("Add product response:", result);
        
        productId = result?.productId || result?._id || result?.id || result?.product?.productId;
        
        if (!productId && productId !== 0) {
          throw new Error("Không thể lấy productId sau khi tạo sản phẩm");
        }
      }

      // Thêm ảnh
      if (validImages.length > 0 && productId) {
        await addProductImages(productId, validImages);
      }

      await fetchProducts();
      handleCloseModal();
      alert(isEditing ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");
    } catch (error) {
      console.error("Submit error:", error);
      alert("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn ẩn sản phẩm này?")) return;
    try {
      setLoading(true);
      const result = await deleteProduct(id);
      alert(result.message || "Sản phẩm đã được ẩn!");
      await fetchProducts();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      alert("Lỗi khi xóa sản phẩm: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("Bạn có chắc muốn khôi phục sản phẩm này?")) return;
    try {
      setLoading(true);
      const result = await restoreProduct(id);
      alert(result.message || "Khôi phục sản phẩm thành công!");
      await fetchProducts();
    } catch (error) {
      alert("Lỗi khi khôi phục: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ SỬA LỖI: handleEdit - Load đầy đủ dữ liệu và giữ category
  const handleEdit = async (product) => {
    try {
      setLoading(true);
      
      const productId = product.productId || product._id;
      console.log("========== EDIT PRODUCT START ==========");
      console.log("Editing product ID:", productId);
      
      // Lấy dữ liệu đầy đủ từ API
      const detailRes = await api.get(`/api/products/${productId}`);
      const fullProduct = detailRes.data?.product || detailRes.data || product;
      
      console.log("Full product data:", fullProduct);
      console.log("pricesList:", fullProduct?.pricesList);
      console.log("productPrices:", fullProduct?.productPrices);

      // ✅ Convert prices thành priceList array
      let priceArr = [];
      
      if (Array.isArray(fullProduct?.pricesList) && fullProduct.pricesList.length > 0) {
        priceArr = fullProduct.pricesList.map((p) => {
          // Convert option_0, option_1... thành key rỗng (giá mặc định)
          let key = p.optionName || "";
          if (key.match(/^option_\d+$/)) {
            key = "";
          }
          return {
            key,
            value: Number(p.optionPrice) || 0,
          };
        });
      } else if (Array.isArray(fullProduct?.productPrices) && fullProduct.productPrices.length > 0) {
        priceArr = fullProduct.productPrices.map((p) => {
          let key = p.optionName || "";
          if (key.match(/^option_\d+$/)) {
            key = "";
          }
          return {
            key,
            value: Number(p.optionPrice) || 0,
          };
        });
      } else if (fullProduct?.prices && typeof fullProduct.prices === 'object') {
        priceArr = Object.entries(fullProduct.prices).map(([key, value]) => {
          // Convert option_0, option_1... thành key rỗng
          let cleanKey = key;
          if (cleanKey.match(/^option_\d+$/)) {
            cleanKey = "";
          }
          return {
            key: cleanKey,
            value: Number(value) || 0,
          };
        });
      }

      console.log("Mapped priceArr:", priceArr);

      // Load ảnh từ API
      let productImages = [];
      try {
        const imagesRes = await api.get(`/api/product-images/${productId}`);
        productImages = imagesRes.data?.images || [];
      } catch (err) {
        console.error("Lỗi khi load ảnh:", err);
      }

      let mappedImages = [];
      if (productImages.length > 0) {
        mappedImages = productImages.map((img) => ({
          imageUrl: img.imageUrl || img.url || img.image || "",
          optionName: img.color || img.optionName || img.option || "",
          publicId: img.publicId || "",
        })).filter(img => img.imageUrl);
      }
      
      if (mappedImages.length === 0 && fullProduct.image) {
        mappedImages = [{ imageUrl: fullProduct.image, optionName: "", publicId: "" }];
      }
      
      if (mappedImages.length === 0) {
        mappedImages = [{ imageUrl: "", optionName: "", publicId: "" }];
      }

      // ✅ Tìm parent và child category
      const currentCategoryId = fullProduct.categoryId?._id || fullProduct.categoryId || "";
      
      let parentId = "";
      let childId = currentCategoryId;
      
      if (currentCategoryId) {
        const currentCat = categories.find(c => 
          String(c.categoryId || c._id) === String(currentCategoryId)
        );
        
        if (currentCat) {
          if (currentCat.parentId) {
            parentId = String(currentCat.parentId);
            childId = String(currentCat.categoryId || currentCat._id);
          } else {
            parentId = String(currentCat.categoryId || currentCat._id);
            childId = "";
          }
        }
      }
      
      console.log("Category mapping:", { currentCategoryId, parentId, childId });
      console.log("========== EDIT PRODUCT END ==========");

      // ✅ Set state - ĐẶT isEditing TRƯỚC khi set category để tránh useEffect reset
      setIsEditing(true);
      setFormParentCategory(parentId);
      setFormChildCategory(childId);

      setFormData({
        id: fullProduct.productId || fullProduct._id,
        name: fullProduct.name || "",
        description: fullProduct.description || "",
        image: fullProduct.image || "",
        images: mappedImages,
        categoryId: childId,
        prices: fullProduct.prices || {},
        stock: fullProduct.stock || 0,
      });

      setPriceList(priceArr.length > 0 ? priceArr : [{ key: "", value: 0 }]);
      setShowModal(true);
    } catch (err) {
      console.error("Lỗi khi load chi tiết sản phẩm:", err);
      alert("Lỗi khi tải thông tin sản phẩm: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
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
      images: [{ imageUrl: "", optionName: "", publicId: "" }],
      categoryId: "",
      prices: {},
      stock: 0,
    });
    setPriceList([{ key: "", value: 0 }]);
  };

  // Image management functions
  const handleImageChange = (index, field, value) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      newImages[index] = { ...newImages[index], [field]: value };
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
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages.length > 0 ? newImages : [{ imageUrl: "", optionName: "", publicId: "" }],
      };
    });
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [index]: true }));
    
    try {
      const result = await uploadImage(file, 'products');
      handleImageChange(index, 'imageUrl', result.url);
      handleImageChange(index, 'publicId', result.publicId);
      alert('Upload ảnh thành công!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Lỗi khi upload ảnh: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleImageDeleteFromCloudinary = async (index) => {
    const image = formData.images[index];
    if (image.publicId) {
      try {
        await deleteImage(image.publicId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
    removeImageField(index);
  };

  const addProductImages = async (productId, images) => {
    try {
      const promises = images
        .filter((img) => img.imageUrl && img.imageUrl.trim())
        .map((img) =>
          api.post("/api/product-images", {
            productId,
            imageUrl: img.imageUrl.trim(),
            color: img.optionName?.trim() || null,
          })
        );
      await Promise.all(promises);
    } catch (error) {
      console.error("Lỗi khi thêm ảnh:", error);
      throw error;
    }
  };

  // ✅ Price management functions
  const handlePriceChange = (index, field, value) => {
    setPriceList((prev) => {
      const updated = [...prev];
      
      if (field === "value") {
        const numValue = Number(value);
        updated[index][field] = isNaN(numValue) ? 0 : numValue;
      } else {
        updated[index][field] = value;
      }
      
      console.log(`Price changed at index ${index}:`, updated[index]);
      return updated;
    });
  };

  const addPriceField = () => {
    setPriceList((prev) => [...prev, { key: "", value: 0 }]);
  };

  const removePriceField = (index) => {
    console.log(`Removing price at index ${index}`);
    setPriceList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [{ key: "", value: 0 }];
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
                    <td className="product-name">
                      {product.name}
                      {product.isDeleted && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          ĐÃ XÓA
                        </span>
                      )}
                      {product.status === 'inactive' && !product.isDeleted && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#ff9800',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          ẨN
                        </span>
                      )}
                      {product.status === 'discontinued' && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          backgroundColor: '#9e9e9e',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          NGỬNG KINH DOANH
                        </span>
                      )}
                    </td>
                    <td>
                      {product.categoryId?.name ||
                        product.categoryName ||
                        "N/A"}
                    </td>
                    <td className="product-price">{renderPrices(product)}</td>
                    <td className="product-stock">{product.stock || 0}</td>
                    <td className="action-buttons">
                      {product.isDeleted ? (
                        <button
                          onClick={() => handleRestore(product.productId || product._id)}
                          className="btn-edit"
                          disabled={loading}
                          title="Khôi phục"
                          style={{ backgroundColor: '#4CAF50' }}
                        >
                          <span>↺ Khôi phục</span>
                        </button>
                      ) : (
                        <>
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
                            title="Ẩn sản phẩm"
                          >
                            <TrashIcon />
                            <span>Ẩn</span>
                          </button>
                        </>
                      )}
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(`Delete button clicked for index ${index}`);
                              removePriceField(index);
                            }}
                            className="btn-remove-price"
                            disabled={priceList.length === 1}
                            title={priceList.length === 1 ? "Phải có ít nhất 1 giá" : "Xóa giá này"}
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