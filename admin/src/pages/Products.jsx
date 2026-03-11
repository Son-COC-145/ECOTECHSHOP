import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminSidebar from "../components/AdminSidebar";
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
import "../styles/ProductList.css";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ✅ Filter 2 tầng: parent -> child
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedChild, setSelectedChild] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState({});

  const [formParentCategory, setFormParentCategory] = useState("");
  const [formChildCategory, setFormChildCategory] = useState("");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    image: "",
    images: [{ imageUrl: "", optionName: "", publicId: "" }],
    categoryId: "",
    prices: {},
    stock: 0,
  });

  const [priceList, setPriceList] = useState([{ key: "", value: 0 }]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // reset child khi đổi parent (filter)
  useEffect(() => {
    setSelectedChild("");
  }, [selectedParent]);

  // reset page khi filter/sort thay đổi
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedParent, selectedChild, sortBy, sortOrder]);

  // Reset child category trong form khi thêm mới
  useEffect(() => {
    if (!isEditing && formParentCategory) {
      setFormChildCategory("");
      setFormData(prev => ({ ...prev, categoryId: "" }));
    }
  }, [formParentCategory, isEditing]);

  // Sync categoryId khi chọn child category trong form
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
    // hỗ trợ nhiều format
    const v =
      product?.categoryId?.categoryId ??
      product?.categoryId?._id ??
      product?.categoryId;
    return v == null ? "" : String(v);
  };

  // Parent categories: parentId null/undefined
  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId == null),
    [categories]
  );

  // Form categories (riêng với filter)
  const formParentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const formChildCategories = useMemo(() => {
    if (!formParentCategory) return [];
    return categories.filter((c) => String(c.parentId) === String(formParentCategory));
  }, [categories, formParentCategory]);

  const childCategories = useMemo(() => {
    if (!selectedParent) return [];
    return categories.filter(
      (c) => String(c.parentId) === String(selectedParent)
    );
  }, [categories, selectedParent]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // filter by search term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(lower) ||
          String(p.productId || p._id || "").includes(lower)
      );
    }

    // no category filter
    if (!selectedParent && !selectedChild) return result;

    // filter by child
    if (selectedChild) {
      const childId = String(selectedChild);
      return result.filter((p) => getProductCategoryId(p) === childId);
    }

    // filter by parent => any child of parent
    const parentId = String(selectedParent);
    const childIds = new Set(
      categories
        .filter((c) => String(c.parentId) === parentId)
        .map((c) => getCategoryIdValue(c))
        .filter(Boolean)
    );

    return result.filter((p) => childIds.has(getProductCategoryId(p)));
  }, [products, categories, selectedParent, selectedChild, searchTerm]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "name") {
        aVal = (a.name || "").toLowerCase();
        bVal = (b.name || "").toLowerCase();
      } else if (sortBy === "stock") {
        aVal = Number(a.stock) || 0;
        bVal = Number(b.stock) || 0;
      } else if (sortBy === "category") {
        aVal = (a.categoryId?.name || a.categoryName || "").toLowerCase();
        bVal = (b.categoryId?.name || b.categoryName || "").toLowerCase();
      } else {
        return 0;
      }
      if (aVal < bVal) return sortOrder === "ASC" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedProducts.length / pageSize);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, page, pageSize]);

  // ✅ Render giá: ưu tiên pricesList (array), fallback prices (object)
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
    priceList.forEach((item, index) => {
      if (item.value !== null && item.value !== undefined && item.value !== "" && !isNaN(Number(item.value))) {
        const key = (item.key || "").trim();
        const finalKey = (key === "" && prices[""] !== undefined) ? `option_${index}` : key;
        prices[finalKey] = Number(item.value);
      }
    });

    try {
      setLoading(true);
      const mainImage = validImages.length > 0 ? validImages[0].imageUrl.trim() : formData.image.trim();
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: mainImage,
        categoryId: formChildCategory,
        prices,
        stock: Number(formData.stock) || 0,
      };

      let productId;
      if (isEditing && formData.id) {
        await updateProduct(formData.id, productData);
        productId = formData.id;
        // Xóa ảnh cũ
        try {
          const existingImagesRes = await api.get(`/api/product-images/${productId}`);
          const existingImages = existingImagesRes.data?.images || [];
          for (const img of existingImages) {
            try { await api.delete(`/api/product-images/${img.imageId || img._id}`); } catch {}
          }
        } catch {}
      } else {
        const result = await addProduct(productData);
        productId = result?.productId || result?._id || result?.id || result?.product?.productId;
        if (!productId && productId !== 0) throw new Error("Không thể lấy productId sau khi tạo sản phẩm");
      }

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
    if (!window.confirm("Bạn có chắc muốn ẩn sản phẩm này?")) return;
    try {
      setLoading(true);
      const result = await deleteProduct(id);
      alert(result.message || "Sản phẩm đã được ẩn!");
      await fetchProducts();
    } catch (error) {
      alert("Lỗi khi xóa sản phẩm: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("Khôi phục sản phẩm này?")) return;
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

  const handleEdit = async (product) => {
    try {
      setLoading(true);
      const productId = product.productId || product._id;

      // Lấy dữ liệu đầy đủ từ API
      const detailRes = await api.get(`/api/products/${productId}`);
      const fullProduct = detailRes.data?.product || detailRes.data || product;

      // Convert prices -> priceList
      let priceArr = [];
      if (Array.isArray(fullProduct?.pricesList) && fullProduct.pricesList.length > 0) {
        priceArr = fullProduct.pricesList.map((p) => ({
          key: (p.optionName || "").match(/^option_\d+$/) ? "" : (p.optionName || ""),
          value: Number(p.optionPrice) || 0,
        }));
      } else if (Array.isArray(fullProduct?.productPrices) && fullProduct.productPrices.length > 0) {
        priceArr = fullProduct.productPrices.map((p) => ({
          key: (p.optionName || "").match(/^option_\d+$/) ? "" : (p.optionName || ""),
          value: Number(p.optionPrice) || 0,
        }));
      } else if (fullProduct?.prices && typeof fullProduct.prices === "object") {
        priceArr = Object.entries(fullProduct.prices).map(([key, value]) => ({
          key: key.match(/^option_\d+$/) ? "" : key,
          value: Number(value) || 0,
        }));
      }

      // Load ảnh
      let mappedImages = [];
      try {
        const imagesRes = await api.get(`/api/product-images/${productId}`);
        mappedImages = (imagesRes.data?.images || []).map((img) => ({
          imageUrl: img.imageUrl || img.url || img.image || "",
          optionName: img.color || img.optionName || "",
          publicId: img.publicId || "",
        })).filter(img => img.imageUrl);
      } catch {}

      if (mappedImages.length === 0 && fullProduct.image) {
        mappedImages = [{ imageUrl: fullProduct.image, optionName: "", publicId: "" }];
      }
      if (mappedImages.length === 0) {
        mappedImages = [{ imageUrl: "", optionName: "", publicId: "" }];
      }

      // Tìm parent/child category
      const currentCategoryId = String(fullProduct.categoryId?._id || fullProduct.categoryId || "");
      let parentId = "";
      let childId = currentCategoryId;
      if (currentCategoryId) {
        const currentCat = categories.find(c => String(c.categoryId || c._id) === currentCategoryId);
        if (currentCat?.parentId) {
          parentId = String(currentCat.parentId);
          childId = String(currentCat.categoryId || currentCat._id);
        } else if (currentCat) {
          parentId = String(currentCat.categoryId || currentCat._id);
          childId = "";
        }
      }

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

  // Image management
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
      return { ...prev, images: newImages.length > 0 ? newImages : [{ imageUrl: "", optionName: "", publicId: "" }] };
    });
  };

  const handleImageUpload = async (index, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [index]: true }));
    try {
      const result = await uploadImage(file, "products");
      handleImageChange(index, "imageUrl", result.url);
      handleImageChange(index, "publicId", result.publicId);
    } catch (error) {
      alert("Lỗi khi upload ảnh: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleImageDeleteFromCloudinary = async (index) => {
    const image = formData.images[index];
    if (image.publicId) {
      try { await deleteImage(image.publicId); } catch {}
    }
    removeImageField(index);
  };

  const addProductImages = async (productId, images) => {
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
  };

  const handlePriceChange = (index, field, value) => {
    setPriceList((prev) => {
      const updated = [...prev];
      if (field === "value") {
        const numValue = Number(value);
        updated[index][field] = isNaN(numValue) ? 0 : numValue;
      } else {
        updated[index][field] = value;
      }
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

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortOrder === "ASC" ? "↑" : "↓"}</span>;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
  };

  const handleViewDetail = (product) => {
    setDetailProduct(product);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailProduct(null);
  };

  // Icon components
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
    <ProtectedRoute>
      <div className="admin-dashboard-layout">
        <AdminSidebar />
        <main className="admin-main-content">
        <div className="product-management-container">
          <div className="product-management-header">
            <div>
              <h1>Quản Lý Sản Phẩm</h1>
              <p style={{ opacity: 0.7, marginTop: 4, fontSize: 14 }}>
                Hiển thị {sortedProducts.length} / {products.length} sản phẩm
              </p>
            </div>
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
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="product-search-input"
            />
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
                setSearchTerm("");
              }}
              disabled={!selectedParent && !selectedChild && !searchTerm}
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
                    <th>STT</th>
                    <th>Hình</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>
                      Tên Sản Phẩm <SortIcon column="name" />
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("category")}>
                      Danh Mục <SortIcon column="category" />
                    </th>
                    <th>Giá</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("stock")}>
                      Tồn Kho <SortIcon column="stock" />
                    </th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        <p>Không có sản phẩm phù hợp bộ lọc.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product, index) => (
                      <tr key={product.productId || product._id}>
                        <td>{(page - 1) * pageSize + index + 1}</td>
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
                          {!!product.isDeleted && (
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#e53935", color: "#fff", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>XÓA</span>
                          )}
                          {product.status === "inactive" && !product.isDeleted && (
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#ff9800", color: "#fff", borderRadius: 4, fontSize: 11 }}>ẨN</span>
                          )}
                          {product.status === "discontinued" && (
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#9e9e9e", color: "#fff", borderRadius: 4, fontSize: 11 }}>NGừNG</span>
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
                          {!!product.isDeleted ? (
                            <button
                              onClick={() => handleRestore(product.productId || product._id)}
                              className="btn-edit"
                              disabled={loading}
                              style={{ background: "#43a047" }}
                            >
                              <span>↺ Khôi phục</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleViewDetail(product)}
                                className="btn-view"
                                title="Xem chi tiết"
                              >
                                <span>Xem</span>
                              </button>
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
                                onClick={() => handleDelete(product.productId || product._id)}
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
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", marginTop: 8 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-pagination"
                >
                  Trang trước
                </button>
                <span>Trang {page} / {totalPages} • {sortedProducts.length} sản phẩm</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-pagination"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>

          {/* Detail Modal */}
          {showDetailModal && detailProduct && (
            <div className="modal-overlay" onClick={closeDetailModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Chi Tiết Sản Phẩm</h2>
                  <button className="modal-close" onClick={closeDetailModal}>×</button>
                </div>
                <div style={{ padding: "1.5rem", display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <img
                    src={detailProduct.image || "/placeholder.png"}
                    alt={detailProduct.name}
                    style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid #eee" }}
                    onError={(e) => { e.target.src = "/placeholder.png"; }}
                  />
                  <div style={{ flex: 1, minWidth: 200, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>ID</p>
                      <p style={{ fontWeight: 600 }}>{detailProduct.productId || detailProduct._id}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Danh mục</p>
                      <p style={{ fontWeight: 600 }}>{detailProduct.categoryId?.name || detailProduct.categoryName || "N/A"}</p>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Tên sản phẩm</p>
                      <p style={{ fontWeight: 600, fontSize: 16 }}>{detailProduct.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Tồn kho</p>
                      <p style={{ fontWeight: 600 }}>{detailProduct.stock || 0}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Giá</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{renderPrices(detailProduct)}</div>
                    </div>
                    {detailProduct.description && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Mô tả</p>
                        <p style={{ lineHeight: 1.6, color: "#444" }}>{detailProduct.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={closeDetailModal}>Đóng</button>
                  <button type="button" className="btn-submit" onClick={() => { closeDetailModal(); handleEdit(detailProduct); }}>Chỉnh sửa</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Add/Edit */}
          {showModal && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>{isEditing ? "Chỉnh Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
                  <button className="modal-close" onClick={handleCloseModal}>
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="product-form-modal">
                  <div className="form-two-columns">
                    {/* Cột trái */}
                    <div className="form-column form-column-left">
                      <div className="form-group">
                        <label htmlFor="name">Tên sản phẩm <span className="required">*</span></label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          placeholder="Nhập tên sản phẩm"
                        />
                      </div>

                      <div className="form-group">
                        <label>Danh mục chính <span className="required">*</span></label>
                        <select
                          value={formParentCategory}
                          onChange={(e) => setFormParentCategory(e.target.value)}
                          required
                        >
                          <option value="">Chọn danh mục chính</option>
                          {formParentCategories.map((cat) => (
                            <option key={cat.categoryId || cat._id} value={cat.categoryId || cat._id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Hãng <span className="required">*</span></label>
                        <select
                          value={formChildCategory}
                          onChange={(e) => setFormChildCategory(e.target.value)}
                          disabled={!formParentCategory}
                          required
                        >
                          <option value="">Chọn hãng</option>
                          {formChildCategories.map((cat) => (
                            <option key={cat.categoryId || cat._id} value={cat.categoryId || cat._id}>
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
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows="5"
                          placeholder="Nhập mô tả sản phẩm"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="stock">Số lượng tồn kho <span className="required">*</span></label>
                        <input
                          type="number"
                          id="stock"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                          required
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Cột phải */}
                    <div className="form-column form-column-right">
                      <div className="form-group">
                        <label>Hình ảnh sản phẩm <span className="required">*</span></label>
                        <div className="images-list-container">
                          {formData.images.map((image, index) => (
                            <div key={index} className="image-card">
                              <div className="image-card-preview">
                                {image.imageUrl ? (
                                  <img
                                    src={image.imageUrl}
                                    alt={`Preview ${index + 1}`}
                                    className="image-preview-card"
                                    onError={(e) => { e.target.src = "/placeholder.png"; }}
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
                                  >×</button>
                                )}
                              </div>
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
                                        e.target.value = "";
                                      }}
                                      className="image-file-input-hidden"
                                      disabled={uploading[index]}
                                    />
                                    <label
                                      htmlFor={`file-input-${index}`}
                                      className="btn-upload-image-card"
                                      style={{ cursor: uploading[index] ? "not-allowed" : "pointer" }}
                                    >
                                      {uploading[index] ? "⏳ Đang upload..." : image.imageUrl ? "📷 Thay đổi ảnh" : "📁 Chọn ảnh"}
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={addImageField} className="btn-add-image">+ Thêm ảnh</button>
                        </div>
                        <p className="form-hint">Ảnh đầu tiên sẽ là ảnh chính.</p>
                      </div>

                      <div className="form-group">
                        <label>Giá sản phẩm</label>
                        <div className="price-list-container">
                          {priceList.map((price, index) => (
                            <div key={index} className="price-item-row">
                              <input
                                type="text"
                                placeholder="Tùy chọn (VD: i7/16/512, 250g)"
                                value={price.key}
                                onChange={(e) => handlePriceChange(index, "key", e.target.value)}
                                className="price-key"
                              />
                              <input
                                type="number"
                                placeholder="Giá (VNĐ)"
                                value={price.value}
                                onChange={(e) => handlePriceChange(index, "value", e.target.value)}
                                min="0"
                                className="price-value"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); removePriceField(index); }}
                                className="btn-remove-price"
                                disabled={priceList.length === 1}
                              >×</button>
                            </div>
                          ))}
                          <button type="button" onClick={addPriceField} className="btn-add-price">+ Thêm giá</button>
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
                    <button
                      type="submit"
                      className="btn-submit"
                      disabled={loading}
                    >
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
    </ProtectedRoute>
  );
};

export default Products;
