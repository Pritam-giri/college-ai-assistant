import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-spinner"></div>
        <p>Verifying admin credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== "admin") {
    return (
      <div className="admin-unauthorized-container">
        <div className="admin-unauthorized-card">
          <div className="admin-unauthorized-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>Access Denied</h2>
          <p>
            You are logged in as <strong>{user.email}</strong> with role{" "}
            <span className={`role-tag role-${user.role}`}>{user.role}</span>.
          </p>
          <p className="admin-unauthorized-sub">
            The admin control panel is restricted to administrative staff only.
          </p>
          <div className="admin-unauthorized-actions">
            <a href="/chatbot" className="admin-btn admin-btn-primary">
              Return to College Assistant
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
