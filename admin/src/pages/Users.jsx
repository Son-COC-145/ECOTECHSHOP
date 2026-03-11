import { useState, useEffect, Fragment } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminSidebar from "../components/AdminSidebar";
import { getAllUsers, getUserById, updateUser, deleteUser, restoreUser } from "../services/userService";
import "../styles/admin-dashboard.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    userId: "",
    username: "",
    email: "",
    phone: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filter or sort changes
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers({ page, limit, search: debouncedSearch, role: roleFilter, sortBy, sortOrder, statusFilter });
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      alert("Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      setDetailLoading(true);
      const user = await getUserById(userId);
      setUserDetail(user);
      setEditFormData({
        userId: user.userId,
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "user",
      });
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết người dùng:", error);
      alert("Không lấy được chi tiết người dùng.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUserId(null);
    setUserDetail(null);
  };

  const toggleUserDetails = async (user) => {
    const id = Number(user?.userId);
    if (!id) return;
    setSelectedUserId(id);
    setShowDetailModal(true);
    await fetchUserDetail(id);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Xóa người dùng "${user.email}"?\nDữ liệu sẽ được ẩn đi, có thể khôi phục sau.`)) return;
    try {
      await deleteUser(user.userId);
      alert("Xóa người dùng thành công!");
      if (selectedUserId === Number(user.userId)) {
        setSelectedUserId(null);
        setUserDetail(null);
      }
      await fetchUsers();
    } catch (error) {
      alert("Lỗi khi xóa: " + (error.response?.data?.message || error.message));
    }
  };

  const handleRestore = async (user) => {
    if (!window.confirm(`Khôi phục người dùng "${user.email}"?`)) return;
    try {
      await restoreUser(user.userId);
      alert("Khôi phục người dùng thành công!");
      await fetchUsers();
    } catch (error) {
      alert("Lỗi khi khôi phục: " + (error.response?.data?.message || error.message));
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortOrder === "ASC" ? "↑" : "↓"}</span>;
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateUser(editFormData.userId, {
        username: editFormData.username,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
      });
      alert("Cập nhật người dùng thành công!");
      setShowEditModal(false);
      await fetchUsers();
      if (selectedUserId === Number(editFormData.userId)) {
        await fetchUserDetail(editFormData.userId);
      }
    } catch (error) {
      alert("Lỗi khi cập nhật: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role) => {
    const normalized = String(role || "").toLowerCase().trim();
    switch (normalized) {
      case "admin":
        return "Quản trị viên";
      case "user":
      case "customer":
        return "Người dùng";
      default:
        return role || "N/A";
    }
  };

  return (
    <ProtectedRoute>
      <div className="admin-dashboard-layout">
        <AdminSidebar />
        <main className="admin-main-content">
          <div className="admin-dashboard">
            <div className="admin-dashboard-header">
              <h1>Quản Lý Người Dùng</h1>
              <p style={{ opacity: 0.8, marginTop: 6 }}>
                Tổng: {Number(total || 0).toLocaleString("vi-VN")} người dùng • {limit} người dùng / trang
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID, email hoặc tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    width: "300px"
                  }}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    background: "#fff"
                  }}
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    background: "#fff"
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="deleted">Đã xóa</option>
                </select>
                {(searchTerm || roleFilter || statusFilter) && (
                  <button
                    onClick={() => { setSearchTerm(""); setRoleFilter(""); setStatusFilter(""); }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      background: "#f5f5f5",
                      cursor: "pointer",
                      color: "red",
                      fontSize: "14px"
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

        {loading && users.length === 0 ? (
          <div className="admin-dashboard-loading">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("userId")}>
                    ID <SortIcon column="userId" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("email")}>
                    Email <SortIcon column="email" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("role")}>
                    Vai trò <SortIcon column="role" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("createdAt")}>
                    Ngày tạo <SortIcon column="createdAt" />
                  </th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const id = Number(user?.userId);
                  return (
                    <Fragment key={id}>
                      <tr style={!!user.isDeleted ? { opacity: 0.55, background: "#fff5f5" } : {}}>
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td>{id}</td>
                        <td>
                          {user.email || "N/A"}
                          {!!user.isDeleted && (
                            <span style={{ marginLeft: 6, fontSize: 11, background: "#e53935", color: "#fff", borderRadius: 4, padding: "1px 6px" }}>Đã xóa</span>
                          )}
                        </td>
                        <td>{getRoleLabel(user.role)}</td>
                        <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "N/A"}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          {!user.isDeleted && (
                            <button onClick={() => toggleUserDetails(user)}>Xem</button>
                          )}
                          {!!user.isDeleted ? (
                            <button
                              onClick={() => handleRestore(user)}
                              style={{ background: "#43a047", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                            >
                              Khôi phục
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(user)}
                              style={{ background: "#e53935", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                            >
                              Xóa
                            </button>
                          )}
                        </td>
                      </tr>


                    </Fragment>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>
                      Không có người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, marginTop: 12 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </button>
              <span>
                Trang {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Trang sau
              </button>
            </div>
          </>
        )}

        {/* Detail Modal */}
        {showDetailModal && (
          <div className="modal-overlay" onClick={closeDetailModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Chi Tiết Người Dùng</h2>
                <button className="modal-close" onClick={closeDetailModal}>×</button>
              </div>
              {detailLoading ? (
                <p style={{ padding: "1.5rem" }}>Đang tải chi tiết...</p>
              ) : userDetail ? (
                <>
                  <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>ID</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.userId}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Tên người dùng</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.username || "N/A"}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Email</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.email || "N/A"}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Số điện thoại</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Quyền truy cập</p>
                      <p style={{ fontWeight: 600 }}>{getRoleLabel(userDetail.role)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Ngày tạo</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleString("vi-VN") : "N/A"}</p>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>Cập nhật lần cuối</p>
                      <p style={{ fontWeight: 600 }}>{userDetail.updatedAt ? new Date(userDetail.updatedAt).toLocaleString("vi-VN") : "N/A"}</p>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={closeDetailModal}>Đóng</button>
                    <button type="button" className="btn-submit" onClick={() => { setShowDetailModal(false); setShowEditModal(true); }}>Chỉnh sửa</button>
                  </div>
                </>
              ) : (
                <p style={{ padding: "1.5rem" }}>Không có dữ liệu.</p>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Chỉnh Sửa Người Dùng</h2>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="product-form-modal">
                <div className="form-group">
                  <label htmlFor="username">Tên người dùng</label>
                  <input
                    type="text"
                    id="username"
                    value={editFormData.username}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, username: e.target.value })
                    }
                    placeholder="Nhập tên người dùng"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    placeholder="Nhập email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    type="text"
                    id="phone"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">Quyền truy cập</label>
                  <select
                    id="role"
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                  >
                    <option value="user">Người dùng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-cancel"
                    disabled={saving}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-submit" disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
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

export default Users;
