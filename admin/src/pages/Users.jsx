import { useState, useEffect, Fragment } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminSidebar from "../components/AdminSidebar";
import { getAllUsers, getUserById, updateUser } from "../services/userService";
import "../styles/admin-dashboard.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    userId: "",
    username: "",
    email: "",
    phone: "",
    role: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers({ page, limit });
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

  const toggleUserDetails = async (user) => {
    const id = Number(user?.userId);
    if (!id) return;

    if (selectedUserId === id && userDetail) {
      setSelectedUserId(null);
      setUserDetail(null);
      setShowEditModal(false);
      return;
    }

    setSelectedUserId(id);
    await fetchUserDetail(id);
  };

  const handleEdit = () => {
    if (userDetail) {
      setShowEditModal(true);
    }
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
                  <th>ID</th>
                  <th>Email</th>
                  <th>Quyền truy cập</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const id = Number(user?.userId);
                  return (
                    <Fragment key={id}>
                      <tr>
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td>{id}</td>
                        <td>{user.email || "N/A"}</td>
                        <td>{getRoleLabel(user.role)}</td>
                        <td>
                          <button onClick={() => toggleUserDetails(user)}>
                            {selectedUserId === id ? "Ẩn" : "Xem"}
                          </button>
                        </td>
                      </tr>

                      {selectedUserId === id && (
                        <tr>
                          <td colSpan="5">
                            <div className="order-details">
                              {detailLoading ? (
                                <p>Đang tải chi tiết...</p>
                              ) : userDetail ? (
                                <>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                    <h3>Chi Tiết Người Dùng</h3>
                                    <button onClick={handleEdit} className="btn-edit-user">
                                      Chỉnh sửa
                                    </button>
                                  </div>
                                  <div className="user-info">
                                    <p><strong>ID:</strong> {userDetail.userId}</p>
                                    <p><strong>Tên người dùng:</strong> {userDetail.username || "N/A"}</p>
                                    <p><strong>Email:</strong> {userDetail.email || "N/A"}</p>
                                    <p><strong>Số điện thoại:</strong> {userDetail.phone || "N/A"}</p>
                                    <p><strong>Quyền truy cập:</strong> {getRoleLabel(userDetail.role)}</p>
                                    <p><strong>Ngày tạo:</strong> {userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleString("vi-VN") : "N/A"}</p>
                                    <p><strong>Cập nhật lần cuối:</strong> {userDetail.updatedAt ? new Date(userDetail.updatedAt).toLocaleString("vi-VN") : "N/A"}</p>
                                  </div>
                                </>
                              ) : (
                                <p>Không có dữ liệu chi tiết.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>
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
