import React, { useEffect, useState, useCallback } from "react";
import { adminAPI, departmentAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedActive, setSelectedActive] = useState("");

  // Modals & Actions
  const [viewStudent, setViewStudent] = useState(null);
  const [statusConfirmStudent, setStatusConfirmStudent] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (selectedDept) params.department = selectedDept;
      if (selectedSem) params.semester = selectedSem;
      if (selectedActive !== "") params.active = selectedActive;

      const res = await adminAPI.getStudents(params);
      if (res.data?.success) {
        setStudents(res.data.data || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch {
      console.error("Failed to load students:");
      setMessage({ type: "error", text: "Failed to load students list." });
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedDept, selectedSem, selectedActive]);

  useEffect(() => {
    departmentAPI
      .getAll()
      .then((res) => {
        if (res.data?.success) {
          setDepartments(res.data.data || []);
        }
      })
      .catch(() => console.error("Failed to fetch departments"));
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleStatus = async () => {
    if (!statusConfirmStudent) return;
    setStatusLoading(true);
    const newStatus = !statusConfirmStudent.active;

    try {
      const res = await adminAPI.updateStudentStatus(statusConfirmStudent._id, newStatus);
      if (res.data?.success) {
        setMessage({
          type: "success",
          text: `Student ${statusConfirmStudent.name} is now ${newStatus ? "Active" : "Inactive"}.`,
        });
        setStatusConfirmStudent(null);
        fetchStudents();
      }
    } catch (err) {
      console.error("Failed to update status");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update status." });
    } finally {
      setStatusLoading(false);
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

      {/* Toolbar / Filters */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="admin-search-box">
            <Search className="admin-search-icon" size={17} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name, email, roll..."
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
            {departments.map((dept) => (
              <option key={dept._id} value={dept.code}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={selectedSem}
            onChange={(e) => {
              setSelectedSem(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={selectedActive}
            onChange={(e) => {
              setSelectedActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchStudents}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Status</th>
                <th>Registered</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 36 }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
                    <span style={{ color: "var(--admin-text-muted)" }}>Loading students...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-icon">
                        <Users size={28} />
                      </div>
                      <h3>No Students Found</h3>
                      <p>Try changing your search terms or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>
                          {student.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {student.rollNumber || "-"}
                    </td>
                    <td>
                      <span className="status-pill indigo">
                        {student.department || "N/A"}
                      </span>
                    </td>
                    <td>
                      {student.semester ? `Sem ${student.semester}` : "Not set"}
                    </td>
                    <td>
                      {student.active ? (
                        <span className="status-pill active">
                          <span className="status-dot" /> Active
                        </span>
                      ) : (
                        <span className="status-pill inactive">
                          <span className="status-dot" /> Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          title="View Student Details"
                          onClick={() => setViewStudent(student)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className={`admin-btn-icon ${student.active ? "danger" : ""}`}
                          title={student.active ? "Deactivate Student" : "Activate Student"}
                          onClick={() => setStatusConfirmStudent(student)}
                        >
                          {student.active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="admin-pagination">
          <span>
            Showing {students.length} of {total} students (Page {page} of {pages})
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

      {/* View Student Details Modal */}
      {viewStudent && (
        <Modal
          open={Boolean(viewStudent)}
          onClose={() => setViewStudent(null)}
          title="Student Profile Details"
          description={`Registered Student ID: ${viewStudent._id}`}
          footer={
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setViewStudent(null)}
            >
              Close
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="admin-form-row">
              <div>
                <label className="admin-form-label">Full Name</label>
                <div style={{ fontWeight: 600 }}>{viewStudent.name}</div>
              </div>
              <div>
                <label className="admin-form-label">Email Address</label>
                <div style={{ color: "var(--admin-text-muted)" }}>{viewStudent.email}</div>
              </div>
            </div>

            <div className="admin-form-row">
              <div>
                <label className="admin-form-label">Department</label>
                <span className="status-pill indigo">{viewStudent.department || "Not Assigned"}</span>
              </div>
              <div>
                <label className="admin-form-label">Roll Number</label>
                <div style={{ fontFamily: "monospace" }}>{viewStudent.rollNumber || "Not Provided"}</div>
              </div>
            </div>

            <div className="admin-form-row">
              <div>
                <label className="admin-form-label">Semester</label>
                <div>{viewStudent.semester ? `Semester ${viewStudent.semester}` : "N/A"}</div>
              </div>
              <div>
                <label className="admin-form-label">Account Status</label>
                <div>
                  {viewStudent.active ? (
                    <span className="status-pill active">
                      <span className="status-dot" /> Active
                    </span>
                  ) : (
                    <span className="status-pill inactive">
                      <span className="status-dot" /> Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-form-row">
              <div>
                <label className="admin-form-label">Phone Number</label>
                <div>{viewStudent.phone || "Not Provided"}</div>
              </div>
              <div>
                <label className="admin-form-label">Registration Date</label>
                <div>{new Date(viewStudent.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {viewStudent.bio && (
              <div>
                <label className="admin-form-label">Student Bio</label>
                <p style={{ background: "var(--admin-table-hover)", padding: 10, borderRadius: 8, fontSize: 13 }}>
                  {viewStudent.bio}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Status Toggle Confirm Dialog */}
      {statusConfirmStudent && (
        <ConfirmDialog
          open={Boolean(statusConfirmStudent)}
          onClose={() => setStatusConfirmStudent(null)}
          onConfirm={handleToggleStatus}
          title={statusConfirmStudent.active ? "Deactivate Student?" : "Activate Student?"}
          description={`Are you sure you want to ${
            statusConfirmStudent.active ? "deactivate" : "activate"
          } ${statusConfirmStudent.name} (${statusConfirmStudent.email})? ${
            statusConfirmStudent.active
              ? "They will not be able to log in or use the assistant until reactivated."
              : "They will regain full access to their account."
          }`}
          confirmLabel={statusConfirmStudent.active ? "Deactivate" : "Activate"}
          danger={statusConfirmStudent.active}
          loading={statusLoading}
        />
      )}
    </div>
  );
};

export default AdminStudents;
