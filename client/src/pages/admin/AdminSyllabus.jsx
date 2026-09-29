import React, { useEffect, useState, useCallback } from "react";
import { syllabusAPI, departmentAPI } from "../../services/api";
import { safeHttpUrl } from "../../safeUrl";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";

const AdminSyllabus = () => {
  const [syllabusList, setSyllabusList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    department: "",
    semester: 1,
    subjectCode: "",
    subjectName: "",
    fileUrl: "",
    topics: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSyllabus = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedSem) params.semester = selectedSem;

      const res = await syllabusAPI.getAll(params);
      if (res.data?.success) {
        setSyllabusList(res.data.data || []);
      }
    } catch {
      console.error("Failed to load syllabus:");
      setMessage({ type: "error", text: "Failed to load syllabus list." });
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedSem]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) setDepartments(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    fetchSyllabus();
  }, [fetchSyllabus]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      department: departments[0]?.code || "",
      semester: 1,
      subjectCode: "",
      subjectName: "",
      fileUrl: "",
      topics: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      department: item.department,
      semester: item.semester,
      subjectCode: item.subjectCode || "",
      subjectName: item.subjectName,
      fileUrl: item.fileUrl || "",
      topics: (item.topics || []).join(", "),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const topicsArray = formData.topics
      ? formData.topics.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      department: formData.department,
      semester: Number(formData.semester),
      subjectCode: formData.subjectCode.trim(),
      subjectName: formData.subjectName.trim(),
      fileUrl: formData.fileUrl.trim(),
      topics: topicsArray,
    };

    try {
      if (editingItem) {
        const res = await syllabusAPI.update(editingItem._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Syllabus for "${formData.subjectName}" updated.` });
          setModalOpen(false);
          fetchSyllabus();
        }
      } else {
        const res = await syllabusAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Syllabus for "${formData.subjectName}" created.` });
          setModalOpen(false);
          fetchSyllabus();
        }
      }
    } catch (err) {
      console.error("Failed to save syllabus");
      setFormError(err.response?.data?.message || "Failed to save syllabus item.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await syllabusAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: `Syllabus for "${deleteConfirm.subjectName}" deleted.` });
        setDeleteConfirm(null);
        fetchSyllabus();
      }
    } catch (err) {
      console.error("Failed to delete syllabus");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete syllabus." });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = syllabusList.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.subjectName?.toLowerCase().includes(term) ||
      item.subjectCode?.toLowerCase().includes(term) ||
      item.topics?.some((t) => t.toLowerCase().includes(term))
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
              placeholder="Search syllabus by subject, code, topics..."
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
            {departments.map((dept) => (
              <option key={dept._id} value={dept.code}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchSyllabus}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Subject Syllabus
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
                <th>Subject Name</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Key Topics</th>
                <th>PDF Link</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading syllabus records...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <BookOpen size={28} />
                      </div>
                      <h3>No Syllabus Found</h3>
                      <p>Add curriculum topics and course outlines for academic programs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span className="status-pill indigo" style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {item.subjectCode || "N/A"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.subjectName}</td>
                    <td>
                      <span className="status-pill indigo">{item.department}</span>
                    </td>
                    <td>Sem {item.semester}</td>
                    <td>
                      {item.topics?.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 260 }}>
                          {item.topics.slice(0, 3).map((topic, i) => (
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
                              {topic}
                            </span>
                          ))}
                          {item.topics.length > 3 && (
                            <span style={{ fontSize: 11, color: "var(--admin-text-muted)" }}>
                              +{item.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--admin-text-light)", fontSize: 12 }}>None</span>
                      )}
                    </td>
                    <td>
                      {item.fileUrl ? (
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
                          <FileText size={14} /> View File <ExternalLink size={11} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          title="Edit Syllabus"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon danger"
                          title="Delete Syllabus"
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
          title={editingItem ? `Edit Syllabus: ${editingItem.subjectName}` : "Add Course Syllabus"}
          description="Outline the subject details, curriculum topics, and document links."
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
                {formLoading ? "Saving..." : editingItem ? "Save Changes" : "Create Syllabus"}
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

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Subject Name <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Subject Code</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. CS-301"
                  value={formData.subjectCode}
                  onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                />
              </div>
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
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.code}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Semester (1 - 6)</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="admin-form-input"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Key Topics (comma-separated)</label>
              <textarea
                className="admin-form-textarea"
                placeholder="e.g. Arrays, Linked Lists, Stacks, Trees, Graphs, Sorting algorithms"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Syllabus PDF / Reference Link</label>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://..."
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
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
          title="Delete Course Syllabus?"
          description={`Are you sure you want to delete the syllabus for "${deleteConfirm.subjectName}" (${deleteConfirm.department} Sem ${deleteConfirm.semester})?`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminSyllabus;
