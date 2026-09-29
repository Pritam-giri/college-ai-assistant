import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import Modal from "./Modal";

const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science & Engineering" },
  { value: "ELECTRONICS", label: "Electronics" },
];

function buildFormState(user) {
  return {
    name: user?.name || "",
    rollNumber: user?.rollNumber || "",
    department: user?.department || "CSE",
    semester: user?.semester ? String(user.semester) : "1",
  };
}

const ProfileModal = ({ open, onClose }) => {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState(() => buildFormState(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildFormState(user));
      setError("");
      setSuccess(false);
    }
    // Only reset when the modal opens, not on every user change while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.rollNumber.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const semesterNumber = Number(form.semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1 ||
      semesterNumber > 6
    ) {
      setError("Semester must be between 1 and 6.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await profileAPI.update({
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim(),
        department: form.department,
        semester: semesterNumber,
      });

      const updatedUser = response?.data?.data;

      if (updatedUser) {
        updateUser(updatedUser);
      }

      setSuccess(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to update profile. Please try again.";

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your profile"
      description="View and update your student details."
      footer={
        <>
          <button type="button" className="modal-button" onClick={onClose}>
            Close
          </button>

          <button
            type="submit"
            form="profile-form"
            className="modal-button modal-button-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <div className="profile-avatar-row">
        <div className="profile-avatar-large">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>

        <div className="profile-avatar-meta">
          <strong>{user?.name || "Student"}</strong>
          <span>{user?.email}</span>
        </div>
      </div>

      {success && (
        <div className="profile-banner profile-banner-success">
          <CheckCircle2 size={15} />
          <span>Profile updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="profile-banner profile-banner-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <form id="profile-form" onSubmit={handleSubmit}>
        <div className="profile-field-grid">
          <div className="form-group">
            <label htmlFor="profile-name">Full name</label>
            <div className="input-wrapper">
              <input
                id="profile-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-roll">Roll number</label>
            <div className="input-wrapper">
              <input
                id="profile-roll"
                name="rollNumber"
                type="text"
                value={form.rollNumber}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-department">Department</label>
            <div className="input-wrapper">
              <select
                id="profile-department"
                name="department"
                value={form.department}
                onChange={handleChange}
                disabled={saving}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-semester">Semester</label>
            <div className="input-wrapper">
              <select
                id="profile-semester"
                name="semester"
                value={form.semester}
                onChange={handleChange}
                disabled={saving}
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Semester {index + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Email address</label>
          <div className="profile-readonly">{user?.email}</div>
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;
