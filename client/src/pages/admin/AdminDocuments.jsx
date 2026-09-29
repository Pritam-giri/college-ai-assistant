import { useEffect, useState, useCallback } from "react";
import { documentAPI, departmentAPI } from "../../services/api";
import { safeHttpUrl } from "../../safeUrl";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const CATEGORIES = ["circular", "form", "result", "academic", "fee-structure", "handbook", "other"];

const AdminDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    department: "ALL",
    category: "circular",
    fileUrl: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedCat) params.category = selectedCat;

      const res = await documentAPI.getAll(params);
      if (res.data?.success) {
        setDocuments(res.data.data || []);
      }
    } catch {
      console.error("Failed to load documents:");
      setMessage({ type: "error", text: "Failed to load documents." });
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedCat]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) setDepartments(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    const request = setTimeout(fetchDocuments, 0);
    return () => clearTimeout(request);
  }, [fetchDocuments]);

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormData({
      title: "",
      department: "ALL",
      category: "circular",
      fileUrl: "",
      description: "",
    });
    setFormError("");
    setSelectedFile(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingDoc(item);
    setFormData({
      title: item.title,
      department: item.department || "ALL",
      category: item.category || "circular",
      fileUrl: item.fileUrl,
      description: item.description || "",
    });
    setFormError("");
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const values = {
      title: formData.title.trim(),
      department: formData.department,
      category: formData.category,
      description: formData.description.trim(),
    };
    const payload = selectedFile ? new FormData() : { ...values, fileUrl: formData.fileUrl.trim() };
    if (selectedFile) {
      Object.entries(values).forEach(([key, value]) => payload.append(key, value));
      payload.append("file", selectedFile);
    }

    try {
      if (editingDoc) {
        const res = await documentAPI.update(editingDoc._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Document "${formData.title}" updated successfully.` });
          setModalOpen(false);
          fetchDocuments();
        }
      } else {
        const res = await documentAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Document "${formData.title}" published successfully.` });
          setModalOpen(false);
          fetchDocuments();
        }
      }
    } catch (err) {
      console.error("Failed to save document");
      setFormError(err.response?.data?.message || "Failed to save document.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await documentAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: `Document "${deleteConfirm.title}" removed.` });
        setDeleteConfirm(null);
        fetchDocuments();
      }
    } catch (err) {
      console.error("Failed to delete document");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete document." });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = documents.filter((doc) => {
    const term = search.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(term) ||
      doc.description?.toLowerCase().includes(term) ||
      doc.category?.toLowerCase().includes(term)
    );
  });

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
              placeholder="Search documents by title, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="admin-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
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
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchDocuments}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Document
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Document Title</th>
                <th>Department</th>
                <th>Category</th>
                <th>Description</th>
                <th>File Link</th>
                <th>AI Search</th>
                <th>Added Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading documents...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <FileText size={28} />
                      </div>
                      <h3>No Documents Found</h3>
                      <p>Upload official college documents, forms, circulars, and PDF links.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td>
                      <span className="status-pill indigo">{item.department || "ALL"}</span>
                    </td>
                    <td>
                      <span className="status-pill warning" style={{ textTransform: "capitalize" }}>
                        {item.category || "other"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)", maxWidth: 220 }}>
                      {item.description || "-"}
                    </td>
                    <td>
                      <a
                        href={safeHttpUrl(item.fileUrl) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--admin-primary)",
                          fontSize: 12.5,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        <ExternalLink size={14} /> {item.originalName || "Open Link"}
                      </a>
                    </td>
                    <td>
                      <span className={`status-pill ${item.indexingStatus === "ready" ? "success" : item.indexingStatus === "failed" ? "danger" : item.indexingStatus === "pending" ? "warning" : "indigo"}`}>
                        {item.indexingStatus === "ready"
                          ? `Ready · ${item.indexedChunkCount || 0} chunks`
                          : item.indexingStatus === "pending"
                          ? "Processing"
                          : item.indexingStatus === "failed"
                          ? "Needs re-upload"
                          : "Link only"}
                      </span>
                      {item.indexingStatus === "failed" && item.indexingMessage && (
                        <div style={{ maxWidth: 220, marginTop: 5, color: "var(--admin-text-muted)", fontSize: 11 }}>
                          {item.indexingMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          title="Edit Document"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon danger"
                          title="Delete Document"
                          onClick={() => setDeleteConfirm(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDoc ? `Edit Document: ${editingDoc.title}` : "Upload / Link College Document"}
          description="Make official circulars, forms, or guides accessible to students and faculty."
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
                {formLoading ? "Saving..." : editingDoc ? "Save Changes" : "Create Document"}
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
                Document Title <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. Scholarship Application Form 2026-27"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Department <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <select
                  className="admin-form-select"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="ALL">ALL (College-Wide / General)</option>
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
              <label className="admin-form-label">PDF URL <span style={{ color: "var(--admin-danger)" }}>*</span></label>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://... (or upload a PDF below)"
                value={formData.fileUrl}
                onChange={(e) => {
                  setFormData({ ...formData, fileUrl: e.target.value });
                  if (e.target.value) setSelectedFile(null);
                }}
                required={!selectedFile}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Or upload a PDF (maximum 10 MB)</label>
              <input
                type="file"
                className="admin-form-input"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="admin-form-hint">Uploaded PDFs are extracted and indexed for chatbot search. Text must be selectable, and Gemini embeddings must be configured. PDF links are stored for download but are not indexed automatically. A selected file replaces the current file.</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Brief Description (Optional)</label>
              <textarea
                className="admin-form-textarea"
                rows={3}
                placeholder="Details on requirements, instructions, or deadlines..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
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
          title="Delete Document?"
          description={`Are you sure you want to delete "${deleteConfirm.title}"?`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminDocuments;
