import { useEffect, useState, useCallback } from "react";
import { noticeAPI, departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  "general",
  "academic",
  "exam",
  "event",
  "holiday",
  "scholarship",
  "placement",
  "administrative",
];

const AdminNotices = () => {
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    department: "ALL",
    category: "general",
    publishedAt: "",
    expiresAt: "",
    attachmentUrl: "",
    attachmentName: "",
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, status: statusFilter };
      if (search.trim()) params.search = search.trim();
      if (selectedDept) params.department = selectedDept;
      if (selectedCategory) params.category = selectedCategory;

      const res = await noticeAPI.getAll(params);
      if (res.data?.success) {
        setNotices(res.data.data || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch {
      console.error("Failed to load notices:");
      setMessage({ type: "error", text: "Failed to load notices." });
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedDept, selectedCategory, statusFilter]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) {
        setDepartments(res.data.data || []);
      }
    });
  }, []);

  useEffect(() => {
    const request = setTimeout(fetchNotices, 0);
    return () => clearTimeout(request);
  }, [fetchNotices]);

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormData({
      title: "",
      body: "",
      department: "ALL",
      category: "general",
      publishedAt: new Date().toISOString().substring(0, 10),
      expiresAt: "",
      attachmentUrl: "",
      attachmentName: "",
    });
    setAttachmentFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingNotice(item);
    setFormData({
      title: item.title,
      body: item.body,
      department: item.department || "ALL",
      category: item.category || "general",
      publishedAt: (item.publishedAt || item.createdAt || new Date().toISOString()).substring(0, 10),
      expiresAt: item.expiresAt ? item.expiresAt.substring(0, 10) : "",
      attachmentUrl: item.attachment?.url || "",
      attachmentName: item.attachment?.originalName || "",
    });
    setAttachmentFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.publishedAt) {
      setFormError("Please choose a publish date.");
      return;
    }
    if (attachmentFile && formData.attachmentUrl.trim()) {
      setFormError("Choose either an attachment file or a link, not both.");
      return;
    }
    setFormLoading(true);
    setFormError("");

    const payload = new FormData();
    payload.append("title", formData.title.trim());
    payload.append("body", formData.body.trim());
    payload.append("department", formData.department);
    payload.append("category", formData.category);
    payload.append("publishedAt", new Date(formData.publishedAt).toISOString());
    payload.append("expiresAt", formData.expiresAt ? new Date(formData.expiresAt).toISOString() : "");
    if (attachmentFile) payload.append("attachment", attachmentFile);
    const originalAttachmentUrl = editingNotice?.attachment?.url || "";
    if ((editingNotice && formData.attachmentUrl.trim() !== originalAttachmentUrl) || (!editingNotice && formData.attachmentUrl.trim())) {
      payload.append("attachmentUrl", formData.attachmentUrl.trim());
      payload.append("attachmentName", formData.attachmentName.trim());
    }

    try {
      if (editingNotice) {
        const res = await noticeAPI.update(editingNotice._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Notice "${formData.title}" updated successfully.` });
          setModalOpen(false);
          fetchNotices();
        }
      } else {
        const res = await noticeAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Notice "${formData.title}" published successfully.` });
          setModalOpen(false);
          fetchNotices();
        }
      }
    } catch (err) {
      console.error("Failed to save notice");
      setFormError(err.response?.data?.message || "Failed to save notice.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await noticeAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: `Notice "${deleteConfirm.title}" removed.` });
        setDeleteConfirm(null);
        fetchNotices();
      }
    } catch (err) {
      console.error("Failed to delete notice");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete notice." });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`admin-alert ${message.type}`}>
          <span>{message.text}</span>
          <button
            type="button"
            className="admin-btn-icon"
            onClick={() => setMessage(null)}
            style={{ width: 24, height: 24 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="admin-search-box">
            <Search className="admin-search-icon" size={17} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search notices by title, content..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="admin-select"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            <option value="ALL">ALL (College-Wide)</option>
            {departments.filter((d) => !d.isAll).map((dept) => (
              <option key={dept._id} value={dept.code}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Expiries</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchNotices}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Publish Notice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Notice Title</th>
                <th>Department</th>
                <th>Category</th>
                <th>Published</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading notices...</span>
                  </td>
                </tr>
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <Bell size={28} />
                      </div>
                      <h3>No Notices Found</h3>
                      <p>Click "Publish Notice" to broadcast circulars or announcements.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                notices.map((item) => {
                  const isExpired = Boolean(item.expiresAt && new Date(item.expiresAt) <= new Date());
                  return (
                    <tr key={item._id}>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--admin-text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.body}
                        </div>
                      </td>
                      <td>
                        <span className="status-pill indigo">{item.department || "ALL"}</span>
                      </td>
                      <td>
                        <span className="status-pill warning" style={{ textTransform: "capitalize" }}>
                          {item.category || "general"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="status-pill danger">
                            <span className="status-dot" /> Expired
                          </span>
                        ) : (
                          <span className="status-pill active">
                            <span className="status-dot" /> Active
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="admin-btn-icon"
                            title="Edit Notice"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-btn-icon danger"
                            title="Delete Notice"
                            onClick={() => setDeleteConfirm(item)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="admin-pagination">
          <span>
            Showing {notices.length} of {total} notices (Page {page} of {pages})
          </span>
          <div className="admin-pagination-btns">
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-secondary"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingNotice ? "Edit Notice Announcement" : "Publish New Notice"}
          description="Circulars and announcements broadcast to students and faculty."
          wide
          footer={
            <>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSubmit}
                disabled={formLoading}
              >
                {formLoading ? "Saving..." : editingNotice ? "Save Changes" : "Publish Notice"}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="admin-alert error" style={{ marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label">
                Notice Title <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. End Semester Examination Schedule Announcement"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Target Department <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <select
                  className="admin-form-select"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="ALL">ALL (College-Wide / All Students)</option>
                  {departments.filter((d) => !d.isAll).map((dept) => (
                    <option key={dept._id} value={dept.code}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Category</label>
                <select
                  className="admin-form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Notice Body / Announcement Text <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <textarea
                className="admin-form-textarea"
                rows={4}
                placeholder="Full details of the announcement..."
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Publish Date</label>
                <input
                  type="date"
                  className="admin-form-input"
                  value={formData.publishedAt}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Expiration Date (Optional)</label>
                <input
                  type="date"
                  className="admin-form-input"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
                <span className="admin-form-hint">Leave blank if notice never expires.</span>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Attachment Link (Optional)</label>
                <input
                  type="url"
                  className="admin-form-input"
                  placeholder="https://..."
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Or upload an attachment</label>
                <input
                  type="file"
                  className="admin-form-input"
                  accept=".pdf,.docx,.xlsx,.pptx"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                />
                <span className="admin-form-hint">PDF, DOCX, XLSX or PPTX, up to 10 MB. Choose a file or a link.</span>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          open={Boolean(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Delete Notice?"
          description={`Are you sure you want to permanently delete "${deleteConfirm.title}"? Students will no longer see this notice.`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminNotices;
