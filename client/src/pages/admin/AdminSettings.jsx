import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { profileAPI } from "../../services/api";
import {
  Settings,
  User,
  Shield,
  Palette,
  Check,
  Server,
  Lock,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const AdminSettings = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await profileAPI.update({ name: name.trim(), phone: phone.trim(), bio: bio.trim() });
      if (res.data?.success) {
        updateUser(res.data.data);
        setProfileMessage({ type: "success", text: "Profile updated successfully." });
      }
    } catch (err) {
      console.error("Failed to update profile");
      setProfileMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 840 }}>
      {/* Profile Settings Card */}
      <div className="admin-table-card" style={{ marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <User size={18} style={{ color: "var(--admin-primary)" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Administrator Profile</h2>
        </div>

        <div style={{ padding: 24 }}>
          {profileMessage && (
            <div className={`admin-alert ${profileMessage.type}`} style={{ marginBottom: 18 }}>
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  className="admin-form-input"
                  value={user?.email || ""}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
                <span className="admin-form-hint">Email is linked to administrative account.</span>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">System Role</label>
                <div style={{ paddingTop: 6 }}>
                  <span className="role-tag role-admin" style={{ fontSize: 13, padding: "5px 12px" }}>
                    <Shield size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Administrator
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="admin-form-input"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Bio / Staff Note</label>
              <textarea
                className="admin-form-textarea"
                rows={2}
                placeholder="Institutional responsibilities..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={profileLoading}
            >
              {profileLoading ? "Saving..." : "Save Profile Details"}
            </button>
          </form>
        </div>
      </div>

      {/* Theme & Display Card */}
      <div className="admin-table-card" style={{ marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Palette size={18} style={{ color: "var(--admin-primary)" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Appearance & Theme</h2>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5, marginBottom: 16 }}>
            Choose your preferred color theme for the administration dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            {[
              { id: "light", label: "Light Mode", icon: Sun },
              { id: "dark", label: "Dark (OLED)", icon: Moon },
              { id: "system", label: "System Default", icon: Monitor },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: 18,
                    borderRadius: 12,
                    border: isSelected
                      ? "2px solid var(--admin-primary)"
                      : "1px solid var(--admin-border)",
                    background: isSelected
                      ? "var(--admin-primary-light)"
                      : "var(--admin-card-bg)",
                    color: isSelected ? "var(--admin-primary)" : "var(--admin-text-main)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                  {isSelected && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Information Card */}
      <div className="admin-table-card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Server size={18} style={{ color: "var(--admin-primary)" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>System Environment</h2>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13.5 }}>
            <div>
              <div style={{ color: "var(--admin-text-muted)", marginBottom: 4 }}>Frontend Environment</div>
              <div style={{ fontWeight: 600 }}>React 19 + Vite</div>
            </div>
            <div>
              <div style={{ color: "var(--admin-text-muted)", marginBottom: 4 }}>Backend API Endpoint</div>
              <div style={{ fontWeight: 600, fontFamily: "monospace" }}>
                {import.meta.env.VITE_API_URL || "http://localhost:5000/api"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--admin-text-muted)", marginBottom: 4 }}>Authentication Shield</div>
              <div>
                <span className="status-pill active">
                  <span className="status-dot" /> JWT Bearer + Role Guard
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: "var(--admin-text-muted)", marginBottom: 4 }}>Knowledge Engine</div>
              <div style={{ fontWeight: 600 }}>Hybrid Institutional RAG Pipeline</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
