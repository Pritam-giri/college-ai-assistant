import React, { useEffect, useRef, useState } from "react";
import {
  User,
  GraduationCap,
  Cpu,
  UserRound,
  CalendarDays,
  ClipboardList,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
  Bell,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../context/ThemeContext";
import { noticeAPI } from "../services/api";
import { safeMarkdownUrl } from "../safeUrl";

function CollegeMark({ compact = false }) {
  return (
    <span
      className={`college-mark${compact ? " college-mark--compact" : ""}`}
      aria-hidden="true"
    >
      <GraduationCap className="college-mark-cap" />
      <span className="college-mark-circuit">
        <Cpu />
      </span>
    </span>
  );
}

/* =========================================================
   MARKDOWN RENDERER
========================================================= */

function formatInlineText(text) {
  if (!text) return null;

  // Split by bold (**text**), inline code (`code`), and italic (*text*)
  const tokens = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Match inline code first
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Match bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Match link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find which match comes earliest
    const matches = [
      codeMatch && { type: "code", index: codeMatch.index, raw: codeMatch[0], content: codeMatch[1] },
      boldMatch && { type: "bold", index: boldMatch.index, raw: boldMatch[0], content: boldMatch[1] },
      linkMatch && { type: "link", index: linkMatch.index, raw: linkMatch[0], content: linkMatch[1], url: safeMarkdownUrl(linkMatch[2]) },
    ].filter(Boolean);

    if (matches.length === 0) {
      tokens.push(<React.Fragment key={keyIndex}>{remaining}</React.Fragment>);
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const earliest = matches[0];

    if (earliest.index > 0) {
      tokens.push(
        <React.Fragment key={keyIndex++}>
          {remaining.slice(0, earliest.index)}
        </React.Fragment>
      );
    }

    if (earliest.type === "code") {
      tokens.push(
        <code key={keyIndex++} className="inline-code">
          {earliest.content}
        </code>
      );
    } else if (earliest.type === "bold") {
      tokens.push(
        <strong key={keyIndex++}>
          {earliest.content}
        </strong>
      );
    } else if (earliest.type === "link" && earliest.url) {
      tokens.push(
        <a
          key={keyIndex++}
          href={earliest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="markdown-link"
        >
          {earliest.content}
        </a>
      );
    } else if (earliest.type === "link") {
      tokens.push(<React.Fragment key={keyIndex++}>{earliest.content}</React.Fragment>);
    }

    remaining = remaining.slice(earliest.index + earliest.raw.length);
  }

  return tokens;
}

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span>{language || "code"}</span>
        <button type="button" onClick={handleCopy} className="code-copy-btn">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>
      <pre className="code-block-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TableRenderer = ({ lines }) => {
  if (!lines || lines.length < 2) return null;

  const parseRow = (row) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="table-responsive">
      <table className="markdown-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{formatInlineText(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{formatInlineText(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MarkdownContent = ({ content = "" }) => {
  if (!content) return null;

  const text = String(content);
  const blocks = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block check (```)
    if (line.trim().startsWith("```")) {
      const language = line.trim().replace(/^```/, "").trim();
      const codeLines = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      blocks.push(
        <CodeBlock
          key={`code-${blocks.length}`}
          code={codeLines.join("\n")}
          language={language}
        />
      );
      continue;
    }

    // Table check (| col | col |)
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("---")
    ) {
      const tableLines = [line, lines[i + 1]];
      i += 2;

      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      blocks.push(
        <TableRenderer key={`table-${blocks.length}`} lines={tableLines} />
      );
      continue;
    }

    // Headers (#, ##, ###)
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="markdown-h3">
          {formatInlineText(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="markdown-h2">
          {formatInlineText(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="markdown-h1">
          {formatInlineText(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Bullet list (- or *)
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }

      blocks.push(
        <ul key={`ul-${blocks.length}`} className="markdown-ul">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInlineText(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list (1. 2.)
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }

      blocks.push(
        <ol key={`ol-${blocks.length}`} className="markdown-ol">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInlineText(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph line
    blocks.push(
      <p key={`p-${blocks.length}`} className="markdown-p">
        {formatInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="markdown-wrapper">{blocks}</div>;
};

/* =========================================================
   CHAT WINDOW COMPONENT
========================================================= */

const ChatWindow = ({
  messages = [],
  loading = false,
  onSuggestionClick,
  onRetry,
}) => {
  const { user } = useAuth();
  const { showTimestamps, autoScroll } = useSettings();
  const { theme, setTheme } = useTheme();

  const messagesEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, loading, autoScroll]);

  const copyMessage = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      console.error("Copy failed:");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const [noticesModal, setNoticesModal] = useState({
    open: false,
    loading: false,
    notices: [],
    error: null,
  });

  useEffect(() => {
    if (!noticesModal.open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setNoticesModal((prev) => ({ ...prev, open: false }));
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [noticesModal.open]);

  const handleOpenRecentNotices = async () => {
    setNoticesModal({ open: true, loading: true, notices: [], error: null });
    try {
      const res = await noticeAPI.getAll({
        department: user?.department || "ALL",
        limit: 5,
      });
      const data = res.data?.data?.notices || res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data.slice(0, 5) : [];
      setNoticesModal({ open: true, loading: false, notices: list, error: null });
    } catch {
      console.error("Failed to load recent notices:");
      setNoticesModal({
        open: true,
        loading: false,
        notices: [],
        error: "Unable to load recent notices. Please try again.",
      });
    }
  };

  const normalizedDepartment = String(user?.department || '').trim().toUpperCase();
  const hodDepartment = normalizedDepartment === 'CSE'
    ? 'CSE'
    : normalizedDepartment === 'ELECTRONICS'
      ? 'Electronics'
      : '';

  const suggestions = [
    {
      question: hodDepartment ? `Who is the ${hodDepartment} HOD?` : 'Who is our HOD?',
      category: "Faculty information",
      icon: UserRound,
    },
    {
      question: "Show my timetable",
      category: "Personal schedule",
      icon: CalendarDays,
    },
    {
      question: "What are my assignments?",
      category: "Coursework",
      icon: ClipboardList,
    },
  ];

  return (
    <main className="chat-window">
      {/* Header */}
      <header className="chat-header">
          <div className="chat-header-info">
          <CollegeMark compact />

          <div>
            <h1>College AI Assistant</h1>
            <span>
              {user?.department
                ? `${user.department} - Government Polytechnic Unnao`
                : "Government Polytechnic Unnao"}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="header-action-button"
            onClick={handleOpenRecentNotices}
            title="Recent Notices & Announcements"
            id="recent-notices-btn"
          >
            <div className="header-action-icon-wrap">
              <Bell size={15} className="header-action-bell" />
            </div>
            <span className="header-action-text">Recent Notices</span>
          </button>

          <div className="header-theme-toggle" title="Switch theme">
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              onClick={() => setTheme("light")}
              title="Light theme"
              aria-label="Light theme"
            >
              <Sun size={14} />
            </button>
            <button
              type="button"
              className={theme === "dark" ? "active" : ""}
              onClick={() => setTheme("dark")}
              title="Dark theme"
              aria-label="Dark theme"
            >
              <Moon size={14} />
            </button>
            <button
              type="button"
              className={theme === "system" ? "active" : ""}
              onClick={() => setTheme("system")}
              title="System theme"
              aria-label="System theme"
            >
              <Monitor size={14} />
            </button>
          </div>

        </div>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <CollegeMark />

            <h2>College AI Assistant</h2>

            <span className="welcome-institution">Government Polytechnic Unnao</span>

            <p>How can I help you today?</p>

            <div className="suggestions">
              {suggestions.map((suggestion) => {
                const SuggestionIcon = suggestion.icon;
                return (
                  <button
                    key={suggestion.question}
                    type="button"
                    className="suggestion-card"
                    onClick={() => onSuggestionClick?.(suggestion.question)}
                  >
                    <span className="suggestion-icon" aria-hidden="true">
                      <SuggestionIcon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="suggestion-copy">
                      <span className="suggestion-category">{suggestion.category}</span>
                      <span className="suggestion-question">{suggestion.question}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => {
              const isUser =
                message.role === "user" || message.sender === "user";

              const messageId = message._id || message.id || index;

              const messageText =
                message.content || message.message || "";

              const isErrorMsg = Boolean(message.isError);

              return (
                <div
                  key={messageId}
                  className={`message-row ${
                    isUser
                      ? "user-message"
                      : isErrorMsg
                      ? "error-message"
                      : "assistant-message"
                  }`}
                >
                  <div className="message-avatar">
                    {isUser ? (
                      <User size={18} />
                    ) : isErrorMsg ? (
                      <AlertCircle size={18} />
                    ) : (
                      <GraduationCap size={18} />
                    )}
                  </div>

                  <div className="message-content">
                    <div className="message-header-row">
                      <span className="message-name">
                        {isUser ? "You" : "College AI"}
                      </span>

                      {showTimestamps && message.createdAt && (
                        <span className="message-timestamp">
                          {formatTime(message.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="message-bubble">
                      <MarkdownContent content={messageText} />
                    </div>

                    {!isUser && Array.isArray(message.sources) && message.sources.length > 0 && (
                      <div className="message-sources" aria-label="Answer sources">
                        <span className="message-sources-title">Sources</span>
                        {message.sources.map((source, sourceIndex) => {
                          const sourceUrl = safeMarkdownUrl(source.url);
                          const sourceDate = source.uploadedAt
                            ? new Date(source.uploadedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "";

                          const sourceContent = (
                            <>
                              <span>{source.title || "College document"}</span>
                              {sourceDate && <small>{sourceDate}</small>}
                              {sourceUrl && <ExternalLink size={13} aria-hidden="true" />}
                            </>
                          );

                          return sourceUrl ? (
                            <a
                              key={`${source.title}-${sourceIndex}`}
                              className="message-source-link"
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {sourceContent}
                            </a>
                          ) : (
                            <div key={`${source.title}-${sourceIndex}`} className="message-source-link">
                              {sourceContent}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isUser && !isErrorMsg && (
                      <button
                        type="button"
                        className="copy-message-button"
                        onClick={() => copyMessage(messageText, messageId)}
                        title="Copy response"
                      >
                        {copiedId === messageId ? (
                          <>
                            <Check size={14} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy
                          </>
                        )}
                      </button>
                    )}

                    {isErrorMsg && onRetry && (
                      <button
                        type="button"
                        className="retry-message-button"
                        onClick={() => onRetry(message.failedText)}
                      >
                        <RotateCcw size={14} />
                        Retry response
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="message-row assistant-message">
                <div className="message-avatar">
                  <GraduationCap size={18} />
                </div>

                <div className="message-content">
                  <div className="message-name">College AI</div>

                  <div className="message-bubble typing-bubble">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Recent Notices Modal */}
      {noticesModal.open && (
        <div className="notices-modal-backdrop" onClick={() => setNoticesModal({ ...noticesModal, open: false })}>
          <div className="notices-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="notices-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={18} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent College Notices</h3>
              </div>
              <button
                type="button"
                className="notices-modal-close"
                onClick={() => setNoticesModal({ ...noticesModal, open: false })}
                aria-label="Close recent college notices"
              >
                <X size={18} />
              </button>
            </div>

            <div className="notices-modal-body">
              {noticesModal.loading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 10px auto" }} />
                  <p>Loading latest notices...</p>
                </div>
              ) : noticesModal.error ? (
                <div className="academic-alert error" style={{ margin: 16 }}>
                  <AlertCircle size={16} />
                  <span>{noticesModal.error}</span>
                </div>
              ) : noticesModal.notices.length === 0 ? (
                <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)" }}>
                  <Bell size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No recent notices are available.</p>
                </div>
              ) : (
                <div className="notices-list-container">
                  {noticesModal.notices.map((n) => {
                    const deptLabel = n.department === "ALL" ? "All Departments" : n.department || "General";
                    const dateFormatted = new Date(n.publishedAt || n.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <article key={n._id} className="notice-item-card">
                        <div className="notice-item-top">
                          <span className="notice-item-tag">{deptLabel}</span>
                          <span className="notice-item-dot">•</span>
                          <span className="notice-item-date">{dateFormatted}</span>
                          {n.category && (
                            <span className="notice-item-cat">{n.category}</span>
                          )}
                        </div>
                        <h4 className="notice-item-title">{n.title}</h4>
                        {n.body && <p className="notice-item-body">{n.body}</p>}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatWindow;
