import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Bell,
  Calendar,
  BookOpen,
  FileText,
  HelpCircle,
  Database,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  LogOut,
  MessageSquare,
  ArrowLeft,
  Shield,
  FlaskConical,
  BookOpenCheck,
} from "lucide-react";
import "../admin.css";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/admin/students", label: "Students", icon: Users },
  { path: "/admin/departments", label: "Departments", icon: Building2 },
  { path: "/admin/faculty", label: "Faculty", icon: GraduationCap },
  { path: "/admin/notices", label: "Notices", icon: Bell },
  { path: "/admin/timetable", label: "Timetable", icon: Calendar },
  { path: "/admin/syllabus", label: "Syllabus", icon: BookOpen },
  { path: "/admin/practicals", label: "Practicals", icon: FlaskConical },
  { path: "/admin/assignments", label: "Assignments", icon: BookOpenCheck },
  { path: "/admin/documents", label: "Documents", icon: FileText },
  { path: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { path: "/admin/knowledge", label: "Knowledge Base", icon: Database },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const handleBack = () => {
    const historyIndex = window.history.state?.idx;
    if (Number.isInteger(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate("/admin", { replace: true });
  };

  // Determine page title
  const currentItem = navItems.find((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );
  const pageTitle = currentItem ? currentItem.label : "Admin Portal";
  const documentTitle = pageTitle === "Dashboard" ? "Admin Dashboard" : pageTitle;

  useEffect(() => {
    document.title = `${documentTitle} | College AI Assistant`;
  }, [documentTitle]);

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="admin-mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "open" : ""
        }`}
      >
        <div className="admin-sidebar-brand">
          <Link to="/admin" className="admin-brand-link">
            <div className="admin-brand-icon">
              <Shield size={22} />
            </div>
            {!collapsed && (
              <div className="admin-brand-info">
                <span className="admin-brand-title">College Admin</span>
                <span className="admin-brand-tag">Administration</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="admin-sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {!collapsed && <span className="admin-nav-category">Management</span>}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `admin-nav-item ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <div className="admin-nav-icon">
                  <Icon size={19} />
                </div>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          {!collapsed && (
            <div className="admin-user-info">
              <div className="admin-user-name">{user?.name || "Administrator"}</div>
              <div className="admin-user-role">{user?.email}</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrap">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-btn-icon"
              id="admin-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open admin navigation"
            >
              <Menu size={20} />
            </button>
            <h1 className="admin-header-title">{pageTitle}</h1>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-header-btn admin-back-btn"
              title="Go back"
              onClick={handleBack}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="admin-header-btn"
              onClick={cycleTheme}
              title={`Theme: ${theme} (Click to switch)`}
            >
              {theme === "system" ? (
                <Monitor size={16} />
              ) : resolvedTheme === "dark" ? (
                <Moon size={16} />
              ) : (
                <Sun size={16} />
              )}
              <span style={{ textTransform: "capitalize" }}>{theme}</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              className="admin-header-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="admin-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
