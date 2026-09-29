import React, { useEffect, useState } from "react";
import { departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import {
  Building2,
  Plus,
  Edit2,
  Search,
  RefreshCw,
  Tag,
  CheckCircle,
  XCircle,
} from "lucide-react";

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    aliases: "",
    active: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAllAdmin();
      if (res.data?.success) {
        setDepartments(res.data.data || []);
      }
    } catch {
      console.error("Failed to load departments:");
      // Fallback to public if getAllAdmin fails
      try {
        const fallback = await departmentAPI.getAll();
        if (fallback.data?.success) {
          setDepartments(fallback.data.data || []);
        }
      } catch (e) {
        setMessage({ type: "error", text: "Failed to load departments." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({ code: "", name: "", aliases: "", active: true });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      aliases: (dept.aliases || []).join(", "),
      active: dept.active,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const aliasesArray = formData.aliases
      ? formData.aliases.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      if (editingDept) {
        // Update
        const payload = {
          name: formData.name.trim(),
          aliases: aliasesArray,
          active: formData.active,
        };
        const res = await departmentAPI.update(editingDept._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Department "${formData.name}" updated successfully.` });
          setModalOpen(false);
          fetchDepartments();
        }
      } else {
        // Create
        const payload = {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          aliases: aliasesArray,
        };
        const res = await departmentAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Department "${formData.name}" created successfully.` });
          setModalOpen(false);
          fetchDepartments();
        }
      }
    } catch (err) {
      console.error("Failed to save department");
      setFormError(err.response?.data?.message || "Failed to save department.");
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = departments.filter((d) => {
    const term = search.toLowerCase();
    return (
      d.name?.toLowerCase().includes(term) ||
      d.code?.toLowerCase().includes(term) ||
      d.aliases?.some((a) => a.toLowerCase().includes(term))
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
              placeholder="Search departments or aliases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchDepartments}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Department
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Department Name</th>
                <th>Chatbot Aliases</th>
                <th>Status</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading departments...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <Building2 size={28} />
                      </div>
                      <h3>No Departments Found</h3>
                      <p>Click "Add Department" to introduce a new branch.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      <span className="status-pill indigo" style={{ fontFamily: "monospace", fontSize: 13 }}>
                        {dept.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{dept.name}</td>
                    <td>
                      {dept.aliases?.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {dept.aliases.map((alias, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--admin-table-hover)",
                                color: "var(--admin-text-muted)",
                                border: "1px solid var(--admin-border)",
                              }}
                            >
                              {alias}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--admin-text-light)", fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td>
                      {dept.active ? (
                        <span className="status-pill active">
                          <span className="status-dot" /> Active
                        </span>
                      ) : (
                        <span className="status-pill inactive">
                          <span className="status-dot" /> Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      {dept.isAll ? (
                        <span className="status-pill warning" style={{ fontSize: 11 }}>
                          College-Wide
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>Standard Branch</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="admin-btn-icon"
                        title="Edit Department"
                        onClick={() => openEditModal(dept)}
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDept ? `Edit Department: ${editingDept.code}` : "Add New Department"}
          description={
            editingDept
              ? "Update display name, chatbot aliases, or toggle active status."
              : "Register a new branch. The department code will be permanent."
          }
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
                {formLoading ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
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
                Department Code {!editingDept && <span style={{ color: "var(--admin-danger)" }}>*</span>}
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. MECH, CIVIL, AI-DS"
                value={formData.code}
                disabled={Boolean(editingDept)}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <span className="admin-form-hint">
                {editingDept
                  ? "Department code is immutable because all related records reference it."
                  : "Unique uppercase code, e.g. CSE, ECE."}
              </span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Department Name <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. Mechanical Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Chatbot Aliases (comma-separated)</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. mech, mechanical, mechatronics"
                value={formData.aliases}
                onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              />
              <span className="admin-form-hint">
                Keywords the AI assistant will recognize when students query this department.
              </span>
            </div>

            {editingDept && !editingDept.isAll && (
              <div className="admin-form-group">
                <label className="admin-form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span>Active Department (visible in student registration & dropdowns)</span>
                </label>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminDepartments;
