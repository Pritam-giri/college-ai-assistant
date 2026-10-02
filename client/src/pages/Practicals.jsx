import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { practicalAPI } from "../services/api";
import { useUnreadContent } from "../context/UnreadContentContext";
import MediaAction from "../components/MediaAction";
import {
  ArrowLeft,
  FlaskConical,
  Calendar,
  Award,
  AlertCircle,
  Search,
  Clock,
  User,
} from "lucide-react";

export default function Practicals() {
  const { user } = useAuth();
  const { markContentRead } = useUnreadContent();
  const [practicals, setPracticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Practicals | College Chatbot";
    fetchPracticals();
  }, [user]);

  const fetchPracticals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await practicalAPI.getAll();
      if (res.data?.success) {
        setPracticals(res.data.data || []);
      }
    } catch {
      console.error("Failed to fetch practicals:");
      setError("Unable to load practicals. Please check back later.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPracticals = practicals.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.subject.toLowerCase().includes(term) ||
      (p.subjectCode && p.subjectCode.toLowerCase().includes(term))
    );
  });

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
              <FlaskConical size={22} />
            </div>
            <div>
              <h1>Practicals</h1>
              <p>
                Practicals for {user?.department || "CSE"} &bull; Semester {user?.semester || "1"}
              </p>
            </div>
          </div>
        </header>

        {/* Search & Filter */}
        <div className="academic-toolbar">
          <div className="academic-search-wrap">
            <Search size={16} className="academic-search-icon" />
            <input
              type="text"
              placeholder="Search practicals by title or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="academic-search-input"
            />
          </div>
          <span className="academic-count">
            {filteredPracticals.length} {filteredPracticals.length === 1 ? "practical" : "practicals"} listed
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="academic-loading">
            <div className="loading-spinner" />
            <p>Loading your practicals...</p>
          </div>
        ) : error ? (
          <div className="academic-alert error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : filteredPracticals.length === 0 ? (
          <div className="academic-empty">
            <FlaskConical size={36} />
            <h3>No practicals found</h3>
            <p>
              {search
                ? "No practicals match your search filter."
                : "No practicals are currently available for your semester."}
            </p>
          </div>
        ) : (
          <div className="academic-grid">
            {filteredPracticals.map((item) => {
              const isDueSoon =
                item.dueDate &&
                new Date(item.dueDate) > new Date() &&
                new Date(item.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000;
              const isPastDue = item.dueDate && new Date(item.dueDate) < new Date();

              return (
                <article key={item._id} className="academic-card">
                  <div className="academic-card-header">
                    <span className="academic-subject-tag">
                      {item.subject} {item.subjectCode ? `(${item.subjectCode})` : ""}
                    </span>
                    <span
                      className={`status-badge ${
                        item.status === "closed" || isPastDue
                          ? "badge-closed"
                          : isDueSoon
                          ? "badge-warning"
                          : "badge-active"
                      }`}
                    >
                      {item.status === "closed"
                        ? "Closed"
                        : isPastDue
                        ? "Past Due"
                        : isDueSoon
                        ? "Due Soon"
                        : "Active"}
                    </span>
                  </div>

                  <h2 className="academic-card-title">
                    <button type="button" className="academic-card-title-open" onClick={() => markContentRead('practical', item._id)}>
                      {item.title}
                    </button>
                  </h2>

                  {item.description && (
                    <p className="academic-card-desc">{item.description}</p>
                  )}

                  {item.instructions && (
                    <div className="academic-card-instructions">
                      <strong>Instructions:</strong>
                      <p>{item.instructions}</p>
                    </div>
                  )}

                  <div className="academic-card-meta">
                    {item.dueDate && (
                      <div className="academic-meta-item">
                        <Calendar size={14} />
                        <span>Due: {new Date(item.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                    {item.totalMarks > 0 && (
                      <div className="academic-meta-item">
                        <Award size={14} />
                        <span>Marks: {item.totalMarks}</span>
                      </div>
                    )}
                    {item.createdBy?.name && (
                      <div className="academic-meta-item">
                        <User size={14} />
                        <span>Instructor: {item.createdBy.name}</span>
                      </div>
                    )}
                  </div>

                  {(item.attachmentUrl || item.image?.url) && (
                    <div className="academic-card-footer">
                      {item.attachmentUrl && <MediaAction url={item.attachmentUrl} mimeType={item.attachment?.mimeType} fileName={item.attachment?.originalName} className="academic-link-btn" />}
                      {item.image?.url && <MediaAction url={item.image.url} mimeType={item.image.mimeType} fileName={item.image.fileName} className="academic-link-btn" />}
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
