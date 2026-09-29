import React, { useEffect, useState, useCallback } from "react";
import { timetableAPI, departmentAPI, facultyAPI } from "../../services/api";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  BookOpen,
  MapPin,
  User,
  PlusCircle,
  X,
} from "lucide-react";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const AdminTimetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [message, setMessage] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState(null);
  const [formData, setFormData] = useState({
    department: "",
    semester: 1,
    day: "MON",
    slots: [],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTimetables = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedSem) params.semester = selectedSem;
      if (selectedDay) params.day = selectedDay;

      const res = await timetableAPI.getAll(params);
      if (res.data?.success) {
        setTimetables(res.data.data || []);
      }
    } catch {
      console.error("Failed to load timetables:");
      setMessage({ type: "error", text: "Failed to load timetables." });
    } finally {
      setLoading(false);
    }
  }, [selectedDept, selectedSem, selectedDay]);

  useEffect(() => {
    departmentAPI.getAll().then((res) => {
      if (res.data?.success) setDepartments(res.data.data || []);
    });
    facultyAPI.getAll().then((res) => {
      if (res.data?.success) setFacultyList(res.data.data || []);
    });
  }, []);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const openCreateModal = () => {
    setEditingTimetable(null);
    setFormData({
      department: departments[0]?.code || "",
      semester: 1,
      day: "MON",
      slots: [{ time: "09:00 - 10:00", subject: "", faculty: "", room: "" }],
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingTimetable(item);
    setFormData({
      department: item.department,
      semester: item.semester,
      day: item.day,
      slots: (item.slots || []).map((s) => ({
        time: s.time || "",
        subject: s.subject || "",
        faculty: typeof s.faculty === "object" ? s.faculty?._id || "" : s.faculty || "",
        room: s.room || "",
      })),
    });
    setFormError("");
    setModalOpen(true);
  };

  const addSlot = () => {
    setFormData({
      ...formData,
      slots: [...formData.slots, { time: "", subject: "", faculty: "", room: "" }],
    });
  };

  const removeSlot = (index) => {
    const next = [...formData.slots];
    next.splice(index, 1);
    setFormData({ ...formData, slots: next });
  };

  const updateSlot = (index, field, value) => {
    const next = [...formData.slots];
    next[index] = { ...next[index], [field]: value };
    setFormData({ ...formData, slots: next });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const payload = {
      department: formData.department,
      semester: Number(formData.semester),
      day: formData.day,
      slots: formData.slots
        .filter((s) => s.subject.trim())
        .map((s) => ({
          time: s.time.trim(),
          subject: s.subject.trim(),
          faculty: s.faculty || null,
          room: s.room.trim(),
        })),
    };

    try {
      if (editingTimetable) {
        const res = await timetableAPI.update(editingTimetable._id, payload);
        if (res.data?.success) {
          setMessage({
            type: "success",
            text: `Timetable for ${formData.department} Sem ${formData.semester} (${formData.day}) updated.`,
          });
          setModalOpen(false);
          fetchTimetables();
        }
      } else {
        const res = await timetableAPI.create(payload);
        if (res.data?.success) {
          setMessage({
            type: "success",
            text: `Timetable for ${formData.department} Sem ${formData.semester} (${formData.day}) created.`,
          });
          setModalOpen(false);
          fetchTimetables();
        }
      }
    } catch (err) {
      console.error("Failed to save timetable");
      setFormError(err.response?.data?.message || "Failed to save timetable entry.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await timetableAPI.delete(deleteConfirm._id);
      if (res.data?.success) {
        setMessage({ type: "success", text: "Timetable schedule removed successfully." });
        setDeleteConfirm(null);
        fetchTimetables();
      }
    } catch (err) {
      console.error("Failed to delete timetable");
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to delete timetable." });
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

          <select
            className="admin-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="">All Days</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={fetchTimetables}
            title="Refresh list"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Add Day Schedule
          </button>
        </div>
      </div>

      {/* Timetable Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div className="admin-spinner" style={{ margin: "0 auto 12px" }} />
          <span style={{ color: "var(--admin-text-muted)" }}>Loading schedules...</span>
        </div>
      ) : timetables.length === 0 ? (
        <div className="admin-table-card">
          <div className="admin-empty-state">
            <div className="admin-empty-icon">
              <Calendar size={28} />
            </div>
            <h3>No Timetables Found</h3>
            <p>Add class schedule routines by department, semester, and day.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
          {timetables.map((item) => (
            <div key={item._id} className="admin-table-card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  padding: "14px 18px",
                  background: "var(--admin-bg)",
                  borderBottom: "1px solid var(--admin-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="status-pill indigo" style={{ fontWeight: 800 }}>
                    {item.day}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {item.department} • Sem {item.semester}
                  </span>
                </div>
                <div style={{ display: "inline-flex", gap: 4 }}>
                  <button
                    type="button"
                    className="admin-btn-icon"
                    title="Edit Schedule"
                    onClick={() => openEditModal(item)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="admin-btn-icon danger"
                    title="Delete Schedule"
                    onClick={() => setDeleteConfirm(item)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ padding: 14 }}>
                {item.slots?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {item.slots.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "var(--admin-table-hover)",
                          border: "1px solid var(--admin-border)",
                          fontSize: 12.5,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--admin-text-main)" }}>
                            {slot.subject}
                          </div>
                          <div style={{ color: "var(--admin-text-muted)", fontSize: 11.5 }}>
                            {slot.faculty?.name ? slot.faculty.name : "Faculty N/A"}
                            {slot.room ? ` • ${slot.room}` : ""}
                          </div>
                        </div>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11.5,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--admin-card-bg)",
                            border: "1px solid var(--admin-border)",
                          }}
                        >
                          {slot.time}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "var(--admin-text-muted)", fontSize: 13, textAlign: "center", padding: 10 }}>
                    No slots assigned
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Timetable Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            editingTimetable
              ? `Edit Schedule: ${editingTimetable.department} Sem ${editingTimetable.semester} (${editingTimetable.day})`
              : "Add Daily Timetable Schedule"
          }
          description="Configure periods, timing, subjects, and instructor assignments."
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
                {formLoading ? "Saving..." : editingTimetable ? "Save Schedule" : "Create Schedule"}
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
                <label className="admin-form-label">
                  Day of Week <span style={{ color: "var(--admin-danger)" }}>*</span>
                </label>
                <select
                  className="admin-form-select"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
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

            {/* Slots Builder */}
            <div style={{ marginTop: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label className="admin-form-label" style={{ marginBottom: 0 }}>
                  Time Slots & Periods
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-secondary"
                  onClick={addSlot}
                >
                  <PlusCircle size={14} /> Add Period
                </button>
              </div>

              {formData.slots.map((slot, index) => (
                <div key={index} className="timetable-slot-row">
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="09:00 - 10:00"
                    value={slot.time}
                    onChange={(e) => updateSlot(index, "time", e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Subject Name"
                    value={slot.subject}
                    onChange={(e) => updateSlot(index, "subject", e.target.value)}
                    required
                  />
                  <select
                    className="admin-form-select"
                    value={slot.faculty}
                    onChange={(e) => updateSlot(index, "faculty", e.target.value)}
                  >
                    <option value="">Select Faculty</option>
                    {facultyList.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.department})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Room/Lab"
                    value={slot.room}
                    onChange={(e) => updateSlot(index, "room", e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-btn-icon danger"
                    onClick={() => removeSlot(index)}
                    title="Remove Slot"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
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
          title="Delete Timetable Day?"
          description={`Are you sure you want to delete the ${deleteConfirm.day} schedule for ${deleteConfirm.department} Semester ${deleteConfirm.semester}?`}
          confirmLabel="Delete"
          danger
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AdminTimetable;
