import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  UserRound,
  CalendarDays,
  ClipboardList,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Bell,
  ExternalLink,
  X,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { noticeAPI } from "../services/api";
import { useUnreadContent } from "../context/UnreadContentContext";
import UnreadBadge from "./UnreadBadge";
import MediaAction from "./MediaAction";
import { safeMarkdownUrl } from "../safeUrl";
import CollegeLogo from "./CollegeLogo";

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
  const { showTimestamps, autoScroll } = useSettings();
  const { unreadCounts } = useUnreadContent();
  const { user } = useAuth();
  const department = String(user?.department || "ALL").trim().toUpperCase();
  const departmentName = department === "CSE"
    ? "CSE"
    : department === "ELECTRONICS"
      ? "Electronics"
      : "department";
  const welcomeMessage = "What would you like to know?";
  const [typedWelcomeMessage, setTypedWelcomeMessage] = useState(() => {
    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduceMotion ? welcomeMessage : "";
  });

  const messagesEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [noticesUnavailable, setNoticesUnavailable] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setTypedWelcomeMessage(welcomeMessage);
      return undefined;
    }

    let characterIndex = 0;
    let timeoutId;
    const typeNextCharacter = () => {
      characterIndex += 1;
      setTypedWelcomeMessage(welcomeMessage.slice(0, characterIndex));
      if (characterIndex < welcomeMessage.length) {
        timeoutId = window.setTimeout(typeNextCharacter, 50);
      }
    };

    timeoutId = window.setTimeout(typeNextCharacter, 50);
    return () => window.clearTimeout(timeoutId);
  }, [welcomeMessage]);

  useEffect(() => {
    let active = true;
    const department = user?.department;
    const params = department && department !== "ALL"
      ? { department, limit: 20 }
      : { limit: 20 };

    noticeAPI.getAll(params)
      .then((response) => {
        if (!active) return;
        const rows = response?.data?.data;
        const fetched = (Array.isArray(rows) ? rows : []).slice().sort((a, b) =>
          new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime()
        );
        const departmentCode = String(department || "").toUpperCase();
        const noticeDepartment = (notice) =>
          String(notice.department?.code || notice.departmentCode || notice.department || "").toUpperCase();
        const isCollegeWide = (notice) => {
          const code = noticeDepartment(notice);
          return !code || code === "ALL" || code === "COLLEGE" || code === "COLLEGE-WIDE";
        };
        const collegeWide = fetched.filter(isCollegeWide);
        const forDepartment = fetched.filter((notice) =>
          noticeDepartment(notice) === departmentCode || notice.department?.name === department
        );
        const departmentNotices = fetched.filter((notice) => !isCollegeWide(notice));
        const preferred = departmentCode && departmentCode !== "ALL"
          ? [...forDepartment.slice(0, 2), ...collegeWide.slice().sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant))).slice(0, 2)]
          : [...collegeWide.slice().sort((a, b) => Number(Boolean(b.isImportant)) - Number(Boolean(a.isImportant))).slice(0, 2), ...departmentNotices.slice(0, 2)];
        const selected = new Map(preferred.map((notice) => [notice._id || notice.id || notice.title, notice]));
        for (const notice of fetched) {
          if (selected.size >= 4) break;
          selected.set(notice._id || notice.id || notice.title, notice);
        }
        setNotices([...selected.values()].sort((a, b) =>
          new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime()
        ));
        setNoticesUnavailable(false);
        setNoticesLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        console.warn("Failed to load recent notices", {
          status: requestError.response?.status,
          message: requestError.response?.data?.message || requestError.message,
        });
        setNoticesUnavailable(true);
        setNoticesLoading(false);
      });

    return () => { active = false; };
  }, [user?.department]);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, loading, autoScroll]);

  useEffect(() => {
    if (!noticesOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setNoticesOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [noticesOpen]);

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

  const formatNoticeDate = (value) => {
    if (!value) return "Date unavailable";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const suggestions = [
    { question: `What are the latest ${departmentName} notices?`, category: "Department notices", icon: Bell },
    { question: "What are the latest college notices?", category: "College-wide notices", icon: ClipboardList },
    { question: `Show me the ${departmentName} timetable.`, category: "Academic information", icon: CalendarDays },
    { question: `Who are the ${departmentName} faculty members?`, category: "Department information", icon: UserRound },
  ];

  return (
    <main className="chat-window">
      {/* Header */}
      <header className="chat-header">
          <div className="chat-header-info">
          <CollegeLogo className="college-mark--compact" />

          <div>
            <h1>College Chatbot</h1>
            <span>AI Assistant for Government Polytechnic Unnao</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="header-action-button"
            aria-haspopup="dialog"
            aria-expanded={noticesOpen}
            aria-controls="recent-notices-modal"
            onClick={() => setNoticesOpen(true)}
          >
            <span className="header-action-icon-wrap"><Bell className="header-action-bell" size={16} /></span>
            <span className="header-action-text">Recent Notices</span>
            <UnreadBadge count={unreadCounts.notices} label="notices" floating />
          </button>
        </div>
      </header>

      {noticesOpen && (
        <div className="notices-modal-backdrop" role="presentation" onClick={() => setNoticesOpen(false)}>
          <section
            className="notices-modal-dialog"
            id="recent-notices-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-notices-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="notices-modal-header">
              <div className="notices-modal-title">
                <Bell size={18} aria-hidden="true" />
                <h3 id="recent-notices-title">Recent Notices</h3>
              </div>
              <button type="button" className="notices-modal-close" onClick={() => setNoticesOpen(false)} aria-label="Close recent notices">
                <X size={18} />
              </button>
            </header>
            <div className="notices-modal-body">
              {noticesLoading ? (
                <p className="recent-notices-empty">Loading recent notices…</p>
              ) : notices.length > 0 ? (
                <div className="notices-list-container">
                  {notices.map((notice) => {
                    const rawDepartment = notice.department?.name || notice.department?.code || notice.departmentName || notice.departmentCode || (typeof notice.department === "string" ? notice.department : "");
                    const departmentLabel = !rawDepartment || String(rawDepartment).toUpperCase() === "ALL" ? "College-wide" : rawDepartment;
                    return (
                      <article className="notice-item-card" key={notice._id || notice.id || notice.title}>
                        <div className="notice-item-top">
                          <span className="notice-item-tag">{departmentLabel}</span>
                          <span className="notice-item-dot">·</span>
                          <span className="notice-item-date">{formatNoticeDate(notice.publishedAt || notice.createdAt)}</span>
                        </div>
                        <h4 className="notice-item-title">
                          <Link
                            to={`/notices/${notice._id || notice.id}`}
                            className="notice-item-open"
                          >
                            {notice.title || "College notice"}
                          </Link>
                        </h4>
                        {notice.body && <p className="notice-item-body">{notice.body}</p>}
                        <div className="notice-item-media-actions">
                          <MediaAction url={notice.attachment?.url} mimeType={notice.attachment?.mimeType} fileName={notice.attachment?.originalName} />
                          <MediaAction url={notice.image?.url} mimeType={notice.image?.mimeType} fileName={notice.image?.originalName} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="recent-notices-empty">
                  {noticesUnavailable ? "Recent notices are temporarily unavailable." : "No recent notices available."}
                </p>
              )}
            </div>
            <footer className="notices-modal-footer">
              <button type="button" className="notices-modal-btn" onClick={() => setNoticesOpen(false)}>Close</button>
            </footer>
          </section>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <CollegeLogo />

            <section className="suggested-questions" aria-label="Suggested questions">
              <p className="welcome-prompt">
                {typedWelcomeMessage}
              </p>
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
            </section>
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
                      <CollegeLogo className="college-mark--message" />
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
                  <CollegeLogo className="college-mark--message" />
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

    </main>
  );
};

export default ChatWindow;
