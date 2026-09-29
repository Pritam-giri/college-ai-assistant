import React, { useEffect, useState } from "react";
import { practicalAPI } from "../../services/api";
import {
  FlaskConical,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";

const initialForm = {
  title: "",
  subject: "",
  subjectCode: "",
  department: "CSE",
  semester: 1,
  description: "",
  instructions: "",
  dueDate: "",
  totalMarks: 100,
  attachmentUrl: "",
  status: "published",
};

export default function AdminPracticals() {
  const [practicals, setPracticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [semFilter, setSemFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    document.title = "Practicals | College AI Assistant";
    fetchPracticals();
  }, [deptFilter, semFilter, statusFilter]);

  const fetchPracticals = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (deptFilter && deptFilter !== "ALL") params.department = deptFilter;
      if (semFilter) params.semester = semFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await practicalAPI.getAll(params);
      if (res.data?.success) {
        setPracticals(res.data.data || []);
      }
    } catch {
      console.error("Failed to load practicals:");
      setError("Failed to load practicals. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setIsEditing(true);
    setEditingId(p._id);
    setForm({
      title: p.title || "",
      subject: p.subject || "",
      subjectCode: p.subjectCode || "",
      department: p.department || "CSE",
      semester: p.semester || 1,
      description: p.description || "",
      instructions: p.instructions || "",
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split("T")[0] : "",
      totalMarks: p.totalMarks !== undefined ? p.totalMarks : 100,
      attachmentUrl: p.attachmentUrl || "",
      status: p.status || "published",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        semester: Number(form.semester),
        totalMarks: Number(form.totalMarks),
      };

      if (isEditing) {
        await practicalAPI.update(editingId, payload);
        setSuccessMsg("Practical updated successfully.");
      } else {
        await practicalAPI.create(payload);
        setSuccessMsg("Practical created successfully.");
      }
      setModalOpen(false);
      fetchPracticals();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Save error:");
      setError(err.response?.data?.message || "Failed to save practical.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await practicalAPI.delete(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      setSuccessMsg("Practical deleted successfully.");
      fetchPracticals();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      console.error("Delete error:");
      setError("Failed to delete practical.");
    }
  };

  const handleQuickStatus = async (id, newStatus) => {
    try {
      await practicalAPI.update(id, { status: newStatus });
      setSuccessMsg(`Practical ${newStatus === "published" ? "published" : "closed"} successfully.`);
      fetchPracticals();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      console.error("Status update error:");
      setError("Failed to update practical status.");
    }
  };

  const filtered = practicals.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.subject.toLowerCase().includes(term) ||
      (p.subjectCode && p.subjectCode.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Alert Messages */}
      {error && (
        <div className="admin-alert error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="admin-alert success" style={{ marginBottom: 16 }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h2>Laboratory Practicals</h2>
          <p>Create and manage department-wise lab practical coursework</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={16} /> Add Practical
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="ELECTRONICS">Electronics</option>
        </select>

        <select
          value={semFilter}
          onChange={(e) => setSemFilter(e.target.value)}
          className="admin-select"
        >
          <option value="">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
          <option value="3">Semester 3</option>
          <option value="4">Semester 4</option>
          <option value="5">Semester 5</option>
          <option value="6">Semester 6</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-select"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>

        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={fetchPracticals}
          title="Refresh List"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table Card */}
      <div className="admin-table-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div className="admin-spinner" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ color: "var(--admin-text-muted)" }}>Loading practicals...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-state admin-empty-state--coursework">
            <div className="admin-empty-icon"><FlaskConical size={24} /></div>
            <p>No practicals found</p>
            <span>Click &ldquo;Add Practical&rdquo; to publish your first lab experiment.</span>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title &amp; Subject</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Total Marks</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong style={{ color: "var(--admin-text-main)" }}>{item.title}</strong>
                      <div style={{ fontSize: 12, color: "var(--admin-text-muted)", marginTop: 2 }}>
                        {item.subject} {item.subjectCode ? `(${item.subjectCode})` : ""}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill indigo">{item.department}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>Sem {item.semester}</span>
                    </td>
                    <td>{item.totalMarks}</td>
                    <td>
                      {item.dueDate ? (
                        <span style={{ fontSize: 12.5 }}>
                          {new Date(item.dueDate).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        <span style={{ color: "var(--admin-text-light)" }}>-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          item.status === "published"
                            ? "active"
                            : item.status === "draft"
                            ? "warning"
                            : "inactive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {item.status !== "published" ? (
                          <button
                            type="button"
                            className="admin-btn-action"
                            onClick={() => handleQuickStatus(item._id, "published")}
                            title="Publish Practical"
                            style={{ color: "var(--admin-success)" }}
                          >
                            <Check size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn-action"
                            onClick={() => handleQuickStatus(item._id, "closed")}
                            title="Close Practical"
                            style={{ color: "var(--admin-warning)" }}
                          >
                            <X size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-btn-action"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Practical"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-action danger"
                          onClick={() => setDeleteConfirm({ open: true, id: item._id })}
                          title="Delete Practical"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-dialog" style={{ maxWidth: 580 }}>
            <div className="admin-modal-header">
              <h3>{isEditing ? "Edit Practical" : "Add New Practical"}</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Practical Title *</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. Implementation of Stack using Arrays"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Subject Name *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Data Structures & Algorithms"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Subject Code</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. CS-301"
                      value={form.subjectCode}
                      onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Department *</label>
                    <select
                      className="admin-form-select"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      required
                    >
                      <option value="CSE">CSE</option>
                      <option value="ELECTRONICS">Electronics</option>
                      <option value="ALL">All Departments</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Semester *</label>
                    <select
                      className="admin-form-select"
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                      required
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                      <option value={3}>Semester 3</option>
                      <option value={4}>Semester 4</option>
                      <option value={5}>Semester 5</option>
                      <option value={6}>Semester 6</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Total Marks</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={form.totalMarks}
                      onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
                      min={0}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Due Date</label>
                    <input
                      type="date"
                      className="admin-form-input"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Status</label>
                  <select
                    className="admin-form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Lab Instructions</label>
                  <textarea
                    rows={3}
                    className="admin-form-textarea"
                    placeholder="Provide execution steps or submission guidelines..."
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Attachment / Lab Manual URL</label>
                  <input
                    type="url"
                    className="admin-form-input"
                    placeholder="https://..."
                    value={form.attachmentUrl}
                    onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Practical"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Practical"
        description="Are you sure you want to delete this practical? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  );
}
