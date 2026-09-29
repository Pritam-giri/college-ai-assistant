import React, { useEffect, useState, useCallback } from "react";
import { facultyAPI, departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Award,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const AdminFaculty = () => {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    designation: "",
    email: "",
    phone: "",
    isHOD: false,
    office: "",
    photo: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      const res = await facultyAPI.getAll(params);
      if (res.data?.success) {
        setFaculty(res.data.data || []);
      }
    } catch {
      console.error("Failed to load faculty:");
      setMessage({ type: "error", text: "Failed to load faculty list." });
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) {
        setDepartments(res.data.data || []);
      }
    });
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const openCreateModal = () => {
    setEditingFaculty(null);
    setFormData({
      name: "",
      department: departments[0]?.code || "",
      designation: "",
      email: "",
      phone: "",
      isHOD: false,
      office: "",
      photo: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingFaculty(item);
    setFormData({
      name: item.name,
      department: item.department,
      designation: item.designation || "",
      email: item.email || "",
      phone: item.phone || "",
      isHOD: item.isHOD || false,
      office: item.office || "",
      photo: item.photo || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      if (editingFaculty) {
        const res = await facultyAPI.update(editingFaculty._id, formData);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Faculty member "${formData.name}" updated successfully.` });
          setModalOpen(false);
          fetchFaculty();
        }
      } else {
        const res = await facultyAPI.create(formData);
        if (res.data?.success) {
          setMessage({ type: "success", text: `Faculty member "${formData.name}" added successfully.` });
          setModalOpen(false);
          fetchFaculty();
        }
      }
    } catch (err) {
      console.error("Failed to save faculty");
      setFormError(err.response?.data?.message || "Failed to save faculty record.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await facultyAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: `Faculty member "${deleteConfirm.name}" removed.` });
        setDeleteConfirm(null);
        fetchFaculty();
      }
    } catch (err) {
      console.error("Failed to delete faculty");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete faculty record." });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = faculty.filter((f) => {
    const term = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(term) ||
      f.designation?.toLowerCase().includes(term) ||
      f.email?.toLowerCase().includes(term)
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
              placeholder="Search faculty by name, title, email..."
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
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchFaculty}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Faculty
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Contact Details</th>
                <th>Office</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading faculty members...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <GraduationCap size={28} />
                      </div>
                      <h3>No Faculty Members Found</h3>
                      <p>Click "Add Faculty" to register professors and department heads.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--admin-primary-light)",
                            color: "var(--admin-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            overflow: "hidden",
                          }}
                        >
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            item.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            {item.name}
                            {item.isHOD && (
                              <span className="status-pill warning" style={{ fontSize: 11, padding: "2px 6px" }}>
                                <Award size={12} /> HOD
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill indigo">{item.department}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{item.designation || "Faculty"}</td>
                    <td>
                      <div style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 2 }}>
                        {item.email && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--admin-text-muted)" }}>
                            <Mail size={12} /> {item.email}
                          </span>
                        )}
                        {item.phone && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--admin-text-muted)" }}>
                            <Phone size={12} /> {item.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--admin-text-muted)" }}>
                      {item.office ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={13} /> {item.office}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          title="Edit Faculty"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon danger"
                          title="Delete Faculty"
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : "Add Faculty Member"}
          description="Enter instructor details for directory and student inquiries."
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
                {formLoading ? "Saving..." : editingFaculty ? "Save Changes" : "Add Faculty"}
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
                  Full Name <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

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
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Designation</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Professor & HOD, Assistant Professor"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Office / Room Location</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Room 204, Academic Block A"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  className="admin-form-input"
                  placeholder="e.g. faculty@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Phone Number</label>
                <input
                  type="tel"
                  className="admin-form-input"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Photo URL (optional)</label>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://..."
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isHOD}
                  onChange={(e) => setFormData({ ...formData, isHOD: e.target.checked })}
                />
                <span>Head of Department (HOD) - Max 1 HOD allowed per department</span>
              </label>
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
          title="Remove Faculty Member?"
          description={`Are you sure you want to delete ${deleteConfirm.name} from the ${deleteConfirm.department} department? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminFaculty;
