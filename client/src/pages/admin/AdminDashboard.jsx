import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../services/api";
import {
  Users,
  GraduationCap,
  Bell,
  Calendar,
  BookOpen,
  FileText,
  HelpCircle,
  Database,
  Building2,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  FlaskConical,
  BookOpenCheck,
  Upload,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ notices: [], students: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getDashboard();
      if (res.data?.success) {
        setStats(res.data.data.stats);
        setRecent(res.data.data.recentActivity);
      }
    } catch {
      console.error("Dashboard fetch error:");
      setError("Failed to load dashboard statistics. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const request = setTimeout(fetchDashboardData, 0);
    return () => clearTimeout(request);
  }, []);

  const statCards = [
    { label: "Total Users", val: stats?.totalUsers ?? 0, icon: Users, color: "indigo", link: "/admin/users" },
    { label: "Total Students", val: stats?.totalStudents ?? 0, icon: Users, color: "indigo", link: "/admin/students" },
    { label: "Faculty Members", val: stats?.totalFaculty ?? 0, icon: GraduationCap, color: "emerald", link: "/admin/faculty" },
    { label: "Active Departments", val: stats?.totalDepartments ?? 0, icon: Building2, color: "amber", link: "/admin/departments" },
    { label: "Published Notices", val: stats?.totalNotices ?? 0, icon: Bell, color: "rose", link: "/admin/notices" },
    { label: "Timetables", val: stats?.totalTimetables ?? 0, icon: Calendar, color: "indigo", link: "/admin/timetable" },
    { label: "Syllabus Records", val: stats?.totalSyllabus ?? 0, icon: BookOpen, color: "emerald", link: "/admin/syllabus" },
    { label: "Lab Practicals", val: stats?.totalPracticals ?? 0, icon: FlaskConical, color: "indigo", link: "/admin/practicals" },
    { label: "Assignments", val: stats?.totalAssignments ?? 0, icon: BookOpenCheck, color: "emerald", link: "/admin/assignments" },
    { label: "Documents", val: stats?.totalDocuments ?? 0, icon: FileText, color: "amber", link: "/admin/documents" },
    { label: "FAQs", val: stats?.totalFaqs ?? 0, icon: HelpCircle, color: "rose", link: "/admin/faqs" },
    { label: "Knowledge Base", val: stats?.totalKnowledge ?? 0, icon: Database, color: "indigo", link: "/admin/knowledge" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 16 }}>
        <div className="admin-spinner" />
        <p style={{ color: "var(--admin-text-muted)" }}>Loading dashboard statistics...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="admin-alert error">
          <span>{error}</span>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-secondary" onClick={fetchDashboardData}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>System Overview</h2>
          <p style={{ color: "var(--admin-text-muted)", fontSize: 13.5 }}>
            Real-time aggregate data across all campus resources
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={fetchDashboardData}>
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              to={card.link}
              className="admin-stat-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="admin-stat-info">
                <span className="admin-stat-label">{card.label}</span>
                <span className="admin-stat-val">{card.val}</span>
              </div>
              <div className={`admin-stat-icon-wrap ${card.color}`}>
                <Icon size={24} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link to="/admin/notices" className="admin-btn admin-btn-primary">
            <PlusCircle size={16} /> Publish Notice
          </Link>
          <Link to="/admin/faculty" className="admin-btn admin-btn-secondary">
            <GraduationCap size={16} /> Add Faculty
          </Link>
          <Link to="/admin/departments" className="admin-btn admin-btn-secondary">
            <Building2 size={16} /> Add Department
          </Link>
          <Link to="/admin/timetable" className="admin-btn admin-btn-secondary">
            <Calendar size={16} /> Manage Timetable
          </Link>
          <Link to="/admin/knowledge" className="admin-btn admin-btn-secondary">
            <Database size={16} /> Add Knowledge Document
          </Link>
        </div>
      </div>

      {/* Recent Activity: 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 20 }}>
        {/* Recent Notices */}
        <div className="admin-table-card">
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} style={{ color: "var(--admin-primary)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Notices</h3>
            </div>
            <Link to="/admin/notices" style={{ fontSize: 12.5, color: "var(--admin-primary)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Dept</th>
                  <th>Category</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.notices?.length > 0 ? (
                  recent.notices.map((n) => (
                    <tr key={n._id}>
                      <td style={{ fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title}
                      </td>
                      <td>
                        <span className="status-pill indigo">{n.department || "ALL"}</span>
                      </td>
                      <td>
                        <span className="status-pill warning" style={{ textTransform: "capitalize" }}>
                          {n.category || "general"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--admin-text-muted)", padding: 24 }}>
                      No notices published yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent uploads */}
        <div className="admin-table-card">
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={18} style={{ color: "var(--admin-primary)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Document Uploads</h3>
            </div>
            <Link to="/admin/documents" style={{ fontSize: 12.5, color: "var(--admin-primary)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead><tr><th>Document</th><th>Department</th><th>Uploaded by</th><th>Date</th></tr></thead>
              <tbody>
                {recent.documents?.length > 0 ? recent.documents.map((document) => (
                  <tr key={document._id}>
                    <td style={{ fontWeight: 600 }}>{document.title}</td>
                    <td><span className="status-pill indigo">{document.department || "ALL"}</span></td>
                    <td>{document.uploadedBy?.name || "Admin"}</td>
                    <td style={{ fontSize: 12, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>{new Date(document.createdAt).toLocaleDateString()}</td>
                  </tr>
                )) : <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--admin-text-muted)", padding: 24 }}>No documents uploaded yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Students */}
        <div className="admin-table-card">
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} style={{ color: "var(--admin-primary)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Student Signups</h3>
            </div>
            <Link to="/admin/students" style={{ fontSize: 12.5, color: "var(--admin-primary)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Dept</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {recent.students?.length > 0 ? (
                  recent.students.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ fontSize: 12.5, color: "var(--admin-text-muted)" }}>{s.email}</td>
                      <td>
                        <span className="status-pill indigo">{s.department || "N/A"}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--admin-text-muted)", padding: 24 }}>
                      No registered students yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
