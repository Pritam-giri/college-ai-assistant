import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { assignmentAPI } from "../services/api";
import { safeHttpUrl } from "../safeUrl";
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  Award,
  FileText,
  AlertCircle,
  ExternalLink,
  Search,
  Clock,
  CheckCircle,
  User,
} from "lucide-react";

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'upcoming', 'due_soon', 'closed'

  useEffect(() => {
    document.title = "Assignments | College AI Assistant";
    fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assignmentAPI.getAll();
      if (res.data?.success) {
        setAssignments(res.data.data || []);
      }
    } catch {
      console.error("Failed to fetch assignments:");
      setError("Unable to load assignments. Please check back later.");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const getAssignmentCategory = (item) => {
    if (item.status === "closed") return "closed";
    if (!item.dueDate) return "upcoming";
    const due = new Date(item.dueDate);
    if (due < now) return "closed";
    const diffDays = (due - now) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) return "due_soon";
    return "upcoming";
  };

  const filteredAssignments = assignments.filter((item) => {
    const category = getAssignmentCategory(item);
    if (activeTab === "upcoming" && category !== "upcoming") return false;
    if (activeTab === "due_soon" && category !== "due_soon") return false;
    if (activeTab === "closed" && category !== "closed") return false;

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.subject.toLowerCase().includes(term) ||
      (item.subjectCode && item.subjectCode.toLowerCase().includes(term))
    );
  });

  const counts = {
    all: assignments.length,
    upcoming: assignments.filter((a) => getAssignmentCategory(a) === "upcoming").length,
    due_soon: assignments.filter((a) => getAssignmentCategory(a) === "due_soon").length,
    closed: assignments.filter((a) => getAssignmentCategory(a) === "closed").length,
  };

  return (
    <div className="academic-page">
      <div className="academic-container">
        {/* Header Bar */}
        <header className="academic-header">
          <Link to="/" className="academic-back-link">
            <ArrowLeft size={16} />
            <span>Back to Assistant</span>
          </Link>
          <div className="academic-brand-row">
            <div className="academic-icon-wrap">
              <BookOpenCheck size={22} />
            </div>
            <div>
              <h1>Assignments</h1>
              <p>
                Assignments for {user?.department || "CSE"} &bull; Semester {user?.semester || "1"}
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="academic-tabs">
          <button
            type="button"
            className={`academic-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`academic-tab ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming ({counts.upcoming})
          </button>
          <button
            type="button"
            className={`academic-tab ${activeTab === "due_soon" ? "active" : ""}`}
            onClick={() => setActiveTab("due_soon")}
          >
            Due Soon ({counts.due_soon})
          </button>
          <button
            type="button"
            className={`academic-tab ${activeTab === "closed" ? "active" : ""}`}
            onClick={() => setActiveTab("closed")}
          >
            Closed ({counts.closed})
          </button>
        </div>

        {/* Search */}
        <div className="academic-toolbar">
          <div className="academic-search-wrap">
            <Search size={16} className="academic-search-icon" />
            <input
              type="text"
              placeholder="Search assignments by title or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="academic-search-input"
            />
          </div>
          <span className="academic-count">
            Showing {filteredAssignments.length} {filteredAssignments.length === 1 ? "assignment" : "assignments"}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="academic-loading">
            <div className="loading-spinner" />
            <p>Loading your assignments...</p>
          </div>
        ) : error ? (
          <div className="academic-alert error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="academic-empty">
            <BookOpenCheck size={36} />
            <h3>No assignments found</h3>
            <p>
              {search
                ? "No assignments match your search filter."
                : "No assignments are currently available for your semester."}
            </p>
          </div>
        ) : (
          <div className="academic-grid">
            {filteredAssignments.map((item) => {
              const category = getAssignmentCategory(item);

              return (
                <article key={item._id} className="academic-card">
                  <div className="academic-card-header">
                    <span className="academic-subject-tag">
                      {item.subject} {item.subjectCode ? `(${item.subjectCode})` : ""}
                    </span>
                    <span
                      className={`status-badge ${
                        category === "closed"
                          ? "badge-closed"
                          : category === "due_soon"
                          ? "badge-warning"
                          : "badge-active"
                      }`}
                    >
                      {category === "closed"
                        ? "Closed"
                        : category === "due_soon"
                        ? "Due Soon"
                        : "Upcoming"}
                    </span>
                  </div>

                  <h2 className="academic-card-title">{item.title}</h2>

                  {item.description && (
                    <p className="academic-card-desc">{item.description}</p>
                  )}

                  {item.instructions && (
                    <div className="academic-card-instructions">
                      <strong>Submission Instructions:</strong>
                      <p>{item.instructions}</p>
                    </div>
                  )}

                  <div className="academic-card-meta">
                    {item.dueDate && (
                      <div className="academic-meta-item">
                        <Calendar size={14} />
                        <span>Deadline: {new Date(item.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                    {item.totalMarks > 0 && (
                      <div className="academic-meta-item">
                        <Award size={14} />
                        <span>Total Marks: {item.totalMarks}</span>
                      </div>
                    )}
                    {item.createdBy?.name && (
                      <div className="academic-meta-item">
                        <User size={14} />
                        <span>Instructor: {item.createdBy.name}</span>
                      </div>
                    )}
                  </div>

                  {item.attachmentUrl && (
                    <div className="academic-card-footer">
                      <a
                        href={safeHttpUrl(item.attachmentUrl) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="academic-link-btn"
                      >
                        <FileText size={14} />
                        <span>Assignment Brief / Worksheet</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
