import { LogOut, User as UserIcon } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";

const APP_VERSION = "1.0.0";

const Toggle = ({ checked, onChange, label }) => (
  <label className="switch" aria-label={label}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="switch-track" />
  </label>
);

const SettingsModal = ({ open, onClose, onOpenProfile }) => {
  const {
    enterToSend,
    setEnterToSend,
    showTimestamps,
    setShowTimestamps,
    autoScroll,
    setAutoScroll,
  } = useSettings();

  const { logout } = useAuth();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Personalize your assistant."
    >
      <div className="settings-section">
        <div className="settings-section-title">Chat</div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Enter to send</strong>
            <span>Press Enter to send, Shift+Enter for a new line.</span>
          </div>
          <Toggle
            checked={enterToSend}
            onChange={setEnterToSend}
            label="Enter to send"
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Show timestamps</strong>
            <span>Display the time next to each message.</span>
          </div>
          <Toggle
            checked={showTimestamps}
            onChange={setShowTimestamps}
            label="Show timestamps"
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <strong>Auto-scroll</strong>
            <span>Automatically scroll to the latest message.</span>
          </div>
          <Toggle
            checked={autoScroll}
            onChange={setAutoScroll}
            label="Auto-scroll"
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Account</div>

        <div
          className="settings-row"
          style={{ cursor: "pointer" }}
          onClick={onOpenProfile}
        >
          <div className="settings-row-label">
            <strong>Profile</strong>
            <span>View and edit your student details.</span>
          </div>
          <UserIcon size={16} />
        </div>

        <div
          className="settings-row"
          style={{ cursor: "pointer" }}
          onClick={logout}
        >
          <div className="settings-row-label">
            <strong style={{ color: "var(--danger)" }}>Logout</strong>
            <span>Sign out of College Chatbot.</span>
          </div>
          <LogOut size={16} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">About</div>

        <div className="settings-about">
          <strong>College Chatbot</strong>
          <div style={{ marginTop: 4 }}>Government Polytechnic Unnao</div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>
            Developed by Pritam Giri (CSE, 2nd Year, 2025-2028)
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
            Version {APP_VERSION}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
