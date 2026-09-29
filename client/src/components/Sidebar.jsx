import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  LogOut,
  GraduationCap,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  User as UserIcon,
  Shield,
  FlaskConical,
  BookOpenCheck,
  Info,
  ChevronUp,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({
  conversations = [],
  activeConversation,
  onNewChat,
  onSelectConversation,
  onSearch,
  isOpen,
  onClose,
  onDeleteConversation,
  onRenameConversation,
  onOpenProfile,
  onOpenSettings,
}) => {
  const { user, logout } = useAuth();

  const [menuId, setMenuId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const sidebarRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuId(null);
        setUserMenuOpen(false);
      }
    };

    const handleOutsideClick = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setMenuId(null);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "";

    const d = new Date(date);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  const handleRename = (conversation) => {
    setMenuId(null);

    onRenameConversation?.(
      conversation._id,
      conversation.title
    );
  };

  const handleDelete = (conversation) => {
    setMenuId(null);

    onDeleteConversation?.(
      conversation._id
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`chat-sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <GraduationCap size={20} />
            </div>

            <div className="sidebar-brand-text">
              <strong>College AI Assistant</strong>
              <span>Govt Polytechnic Unnao</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="sidebar-actions">
          <button
            type="button"
            className="new-chat-button"
            onClick={() => {
              setMenuId(null);
              onNewChat();
            }}
          >
            <Plus size={19} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className="search-chat-button"
            onClick={() => {
              setMenuId(null);
              onSearch();
            }}
          >
            <Search size={18} />
            <span>Search chats</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        {/* Academic Coursework Links */}
        <div className="sidebar-academic-links">
          <Link
            to="/assignments"
            className="sidebar-academic-link"
            onClick={() => setMenuId(null)}
          >
            <BookOpenCheck size={16} />
            <span>Assignments</span>
          </Link>
          <Link
            to="/practicals"
            className="sidebar-academic-link"
            onClick={() => setMenuId(null)}
          >
            <FlaskConical size={16} />
            <span>Practicals</span>
          </Link>
        </div>

        {/* Administration Section (Admins Only) */}
        {user?.role === "admin" && (
          <div className="sidebar-admin-section">
            <div className="sidebar-admin-header">
              <span>Administration</span>
            </div>
            <Link
              to="/admin"
              className="sidebar-admin-link"
              onClick={() => setMenuId(null)}
            >
              <Shield size={16} />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Recent Chats */}
        <div className="recent-section">
          <div className="recent-header">
            <span>Recent chats</span>

            {conversations.length > 0 && (
              <span className="recent-count">
                {conversations.length}
              </span>
            )}
          </div>

          <div className="conversation-list">
            {conversations.length === 0 ? (
              <div className="empty-conversations">
                <MessageSquare size={20} />

                <p>No conversations yet</p>

                <span>
                  Start a new chat with your
                  college assistant.
                </span>
              </div>
            ) : (
              conversations.map(
                (conversation) => {
                  const isActive =
                    activeConversation?._id ===
                    conversation._id;

                  const isMenuOpen =
                    menuId ===
                    conversation._id;

                  return (
                    <div
                      key={conversation._id}
                      className={`conversation-wrapper ${
                        isActive ? "active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className={`conversation-item ${
                          isActive ? "active" : ""
                        }`}
                        onClick={() => {
                          setMenuId(null);

                          onSelectConversation(
                            conversation
                          );
                        }}
                      >
                        <MessageSquare size={17} />

                        <div className="conversation-content">
                          <span className="conversation-title">
                            {conversation.title ||
                              "New Chat"}
                          </span>

                          <span className="conversation-date">
                            {formatDate(
                              conversation.lastMessageAt ||
                                conversation.updatedAt ||
                                conversation.createdAt
                            )}
                          </span>
                        </div>
                      </button>

                      {/* Three dot button */}
                      <button
                        type="button"
                        className="conversation-more"
                        onClick={(event) => {
                          event.stopPropagation();

                          setMenuId(
                            isMenuOpen
                              ? null
                              : conversation._id
                          );
                        }}
                        aria-label="Chat options"
                      >
                        <MoreHorizontal
                          size={17}
                        />
                      </button>

                      {/* Rename/Delete menu */}
                      {isMenuOpen && (
                        <div
                          className="conversation-menu"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleRename(
                                conversation
                              )
                            }
                          >
                            <Pencil size={15} />
                            <span>Rename</span>
                          </button>

                          <button
                            type="button"
                            className="delete-chat-option"
                            onClick={() =>
                              handleDelete(
                                conversation
                              )
                            }
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>

        {/* Compact User / Profile Footer with Popover Menu */}
        <div className="sidebar-bottom" ref={userMenuRef}>
          {userMenuOpen && (
            <div className="sidebar-user-popover" role="menu">
              <button
                type="button"
                className="user-popover-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onOpenProfile?.();
                }}
              >
                <UserIcon size={16} />
                <span>Profile</span>
              </button>

              <button
                type="button"
                className="user-popover-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onOpenSettings?.();
                }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>

              <Link
                to="/about"
                className="user-popover-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onClose?.();
                }}
              >
                <Info size={16} />
                <span>About</span>
              </Link>

              <div className="user-popover-divider" />

              <button
                type="button"
                className="user-popover-item logout"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`sidebar-user-card ${userMenuOpen ? "active" : ""}`}
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            title="Account Options"
          >
            <div className="sidebar-user-avatar">
              {user?.name
                ? user.name
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div className="sidebar-user-info">
              <strong className="sidebar-user-name">
                {user?.name || "Student"}
              </strong>

              <span className="sidebar-user-meta">
                {user?.department || "CSE"}
                {user?.semester ? ` • Sem ${user.semester}` : ""}
              </span>
            </div>

            <div className="sidebar-user-chevron">
              <ChevronUp
                size={16}
                className={`user-chevron-icon ${userMenuOpen ? "open" : ""}`}
              />
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;