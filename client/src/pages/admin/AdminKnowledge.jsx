import React, { useEffect, useState, useCallback } from "react";
import { knowledgeAPI, departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const AdminKnowledge = () => {
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    department: "ALL",
    keywords: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;

      const res = await knowledgeAPI.getAll(params);
      if (res.data?.success) {
        setKnowledgeList(res.data.data || []);
      }
    } catch {
      console.error("Failed to load knowledge base:");
      setMessage({ type: "error", text: "Failed to load knowledge base." });
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) setDepartments(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      content: "",
      department: "ALL",
      keywords: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      department: item.department || "ALL",
      keywords: (item.keywords || []).join(", "),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const keywordsArray = formData.keywords
      ? formData.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [];

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      department: formData.department,
      keywords: keywordsArray,
    };

    try {
      if (editingItem) {
        const res = await knowledgeAPI.update(editingItem._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Knowledge article "${formData.title}" updated.` });
          setModalOpen(false);
          fetchKnowledge();
        }
      } else {
        const res = await knowledgeAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Knowledge article "${formData.title}" created.` });
          setModalOpen(false);
          fetchKnowledge();
        }
      }
    } catch (err) {
      console.error("Failed to save knowledge document");
      setFormError(err.response?.data?.message || "Failed to save article.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await knowledgeAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: `Article "${deleteConfirm.title}" removed.` });
        setDeleteConfirm(null);
        fetchKnowledge();
      }
    } catch (err) {
      console.error("Failed to delete article");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete article." });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = knowledgeList.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(term) ||
      item.content?.toLowerCase().includes(term) ||
      item.keywords?.some((k) => k.toLowerCase().includes(term))
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
              placeholder="Search knowledge base articles..."
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
            <option value="ALL">ALL (College-Wide / General)</option>
            {departments.filter((d) => !d.isAll).map((dept) => (
              <option key={dept._id} value={dept.code}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchKnowledge}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Knowledge Document
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Article Title</th>
                <th>Department</th>
                <th>Content Excerpt</th>
                <th>Search Keywords</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading knowledge articles...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <Database size={28} />
                      </div>
                      <h3>No Knowledge Articles Found</h3>
                      <p>The knowledge base feeds context directly to the AI Assistant retrieval pipeline.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, maxWidth: 240 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Sparkles size={14} style={{ color: "var(--admin-primary)", flexShrink: 0 }} />
                        {item.title}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill indigo">{item.department || "ALL"}</span>
                    </td>
                    <td
                      style={{
                        maxWidth: 340,
                        fontSize: 12.5,
                        color: "var(--admin-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.content}
                    </td>
                    <td>
                      {item.keywords?.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {item.keywords.map((kw, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--admin-table-hover)",
                                border: "1px solid var(--admin-border)",
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--admin-text-light)", fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          title="Edit Article"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon danger"
                          title="Delete Article"
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
          title={editingItem ? `Edit Knowledge: ${editingItem.title}` : "Add Knowledge Base Document"}
          description="Context articles indexed by the AI retrieval engine to formulate accurate answers."
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
                {formLoading ? "Saving..." : editingItem ? "Save Changes" : "Create Article"}
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
                Department <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <select
                className="admin-form-select"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              >
                <option value="ALL">ALL (College-Wide / General Knowledge)</option>
                {departments.filter((d) => !d.isAll).map((dept) => (
                  <option key={dept._id} value={dept.code}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Article Title <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. Campus Hostel Rules and Curfew Timings"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Detailed Knowledge Content <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <textarea
                className="admin-form-textarea"
                rows={6}
                placeholder="Write detailed institutional information. The AI chatbot uses this to answer specific queries..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Keywords for Semantic Retrieval (comma-separated)</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. hostel, curfew, warden, mess timings, gate pass"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
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
          title="Delete Knowledge Article?"
          description={`Are you sure you want to remove "${deleteConfirm.title}" from the knowledge base?`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminKnowledge;
