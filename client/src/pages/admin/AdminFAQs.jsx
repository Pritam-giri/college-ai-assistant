import React, { useEffect, useState, useCallback } from "react";
import { faqAPI, departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Tag,
} from "lucide-react";

const AdminFAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    department: "ALL",
    tags: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;

      const res = await faqAPI.getAll(params);
      if (res.data?.success) {
        setFaqs(res.data.data || []);
      }
    } catch {
      console.error("Failed to load FAQs:");
      setMessage({ type: "error", text: "Failed to load FAQs." });
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
    fetchFaqs();
  }, [fetchFaqs]);

  const openCreateModal = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      department: "ALL",
      tags: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingFaq(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      department: item.department || "ALL",
      tags: (item.tags || []).join(", "),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const tagsArray = formData.tags
      ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      department: formData.department,
      tags: tagsArray,
    };

    try {
      if (editingFaq) {
        const res = await faqAPI.update(editingFaq._id, payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: "FAQ updated successfully." });
          setModalOpen(false);
          fetchFaqs();
        }
      } else {
        const res = await faqAPI.create(payload);
        if (res.data?.success) {
          setMessage({ type: "success", text: "FAQ added successfully." });
          setModalOpen(false);
          fetchFaqs();
        }
      }
    } catch (err) {
      console.error("Failed to save FAQ");
      setFormError(err.response?.data?.message || "Failed to save FAQ.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await faqAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: "FAQ removed." });
        setDeleteConfirm(null);
        fetchFaqs();
      }
    } catch (err) {
      console.error("Failed to delete FAQ");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete FAQ." });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = faqs.filter((faq) => {
    const term = search.toLowerCase();
    return (
      faq.question?.toLowerCase().includes(term) ||
      faq.answer?.toLowerCase().includes(term) ||
      faq.tags?.some((t) => t.toLowerCase().includes(term))
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
              placeholder="Search FAQs by question, answer, tags..."
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
            <option value="ALL">ALL (General / College-Wide)</option>
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
            onClick={fetchFaqs}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Department</th>
                <th>Tags</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading FAQs...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <HelpCircle size={28} />
                      </div>
                      <h3>No FAQs Found</h3>
                      <p>Frequently Asked Questions provide instant answers for student chatbot queries.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, maxWidth: 260 }}>{item.question}</td>
                    <td
                      style={{
                        maxWidth: 320,
                        fontSize: 12.5,
                        color: "var(--admin-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.answer}
                    </td>
                    <td>
                      <span className="status-pill indigo">{item.department || "ALL"}</span>
                    </td>
                    <td>
                      {item.tags?.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {item.tags.map((tag, i) => (
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
                              {tag}
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
                          title="Edit FAQ"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon danger"
                          title="Delete FAQ"
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
          title={editingFaq ? "Edit Frequently Asked Question" : "Add FAQ"}
          description="Create structured Q&A pairs for the AI chatbot to answer instantly."
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
                {formLoading ? "Saving..." : editingFaq ? "Save Changes" : "Create FAQ"}
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
                <option value="ALL">ALL (College-Wide / General Questions)</option>
                {departments.filter((d) => !d.isAll).map((dept) => (
                  <option key={dept._id} value={dept.code}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Question <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. How do I apply for a duplicate ID card?"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Answer <span style={{ color: "var(--admin-danger)" }}>*</span>
              </label>
              <textarea
                className="admin-form-textarea"
                rows={4}
                placeholder="Clear and detailed answer for the student..."
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Search Tags (comma-separated)</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="e.g. id card, library, duplicate, fees"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <span className="admin-form-hint">
                Keywords that help students find this question in search and chat.
              </span>
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
          title="Delete FAQ?"
          description={`Are you sure you want to delete the question: "${deleteConfirm.question}"?`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminFAQs;
