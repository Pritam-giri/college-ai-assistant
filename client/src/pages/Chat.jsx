import React, { useEffect, useMemo, useState } from "react";
import { Menu, Search, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import ProfileModal from "../components/ProfileModal";
import SettingsModal from "../components/SettingsModal";
import RenameDialog from "../components/RenameDialog";
import ConfirmDialog from "../components/ConfirmDialog";

import { useAuth } from "../context/AuthContext";
import {
  conversationAPI,
  chatAPI,
} from "../services/api";

const Chat = () => {
  const { user, logout } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");

  // Modals state
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Rename modal state
  const [renameModal, setRenameModal] = useState({
    open: false,
    id: null,
    title: "",
    loading: false,
    error: "",
  });

  // Delete confirm modal state
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    loading: false,
  });

  /* =========================
     LOAD CONVERSATIONS
  ========================= */

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.getAll();

      const data =
        response?.data?.data ||
        response?.data ||
        [];

      setConversations(
        Array.isArray(data) ? data : []
      );
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        await logout();
        return;
      }

      console.error("Failed to load conversations:");

      setError("Unable to load chat history.");
    }
  };

  useEffect(() => {
    document.title = "College AI Assistant";
    loadConversations();
  }, []);

  /* =========================
     SEARCH
  ========================= */

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((chat) =>
      (chat.title || "")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, searchText]);

  /* =========================
     NEW CHAT
  ========================= */

  const createNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setError("");
    setSidebarOpen(false);
  };

  /* =========================
     OPEN CHAT
  ========================= */

  const selectConversation = async (conversation) => {
    if (!conversation?._id) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await conversationAPI.getOne(conversation._id);

      const data =
        response?.data?.data ||
        response?.data ||
        {};

      setActiveConversation(
        data.conversation || conversation
      );

      setMessages(
        Array.isArray(data.messages)
          ? data.messages
          : []
      );

      setSidebarOpen(false);
    } catch {
      console.error("Failed to open conversation:");

      setError("Unable to open this conversation.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     DELETE CHAT MODAL HANDLERS
  ========================= */

  const openDeleteDialog = (conversationId) => {
    setDeleteModal({
      open: true,
      id: conversationId,
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    const conversationId = deleteModal.id;

    if (!conversationId) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));

      await conversationAPI.delete(conversationId);

      setConversations((prev) =>
        prev.filter((item) => item._id !== conversationId)
      );

      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }

      setDeleteModal({ open: false, id: null, loading: false });
    } catch {
      console.error("Failed to delete conversation:");
      setError("Unable to delete conversation.");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  /* =========================
     RENAME CHAT MODAL HANDLERS
  ========================= */

  const openRenameDialog = (conversationId, currentTitle) => {
    setRenameModal({
      open: true,
      id: conversationId,
      title: currentTitle || "New Chat",
      loading: false,
      error: "",
    });
  };

  const handleConfirmRename = async (newTitle) => {
    const conversationId = renameModal.id;

    if (!conversationId || !newTitle.trim()) return;

    try {
      setRenameModal((prev) => ({ ...prev, loading: true, error: "" }));

      const response = await conversationAPI.update(conversationId, {
        title: newTitle.trim(),
      });

      const updatedConversation =
        response?.data?.data || response?.data;

      setConversations((prev) =>
        prev.map((item) =>
          item._id === conversationId
            ? {
                ...item,
                ...(updatedConversation || {}),
                title: newTitle.trim(),
              }
            : item
        )
      );

      if (activeConversation?._id === conversationId) {
        setActiveConversation((prev) => ({
          ...prev,
          title: newTitle.trim(),
        }));
      }

      setRenameModal({
        open: false,
        id: null,
        title: "",
        loading: false,
        error: "",
      });
    } catch (err) {
      console.error("Failed to rename conversation:");

      const msg =
        err.response?.data?.message || "Unable to rename conversation.";

      setRenameModal((prev) => ({ ...prev, loading: false, error: msg }));
    }
  };

  /* =========================
     CREATE CONVERSATION
  ========================= */

  const createConversation = async (firstMessage) => {
    const title =
      firstMessage.length > 45
        ? `${firstMessage.slice(0, 45)}...`
        : firstMessage;

    // Use logged-in student's department, falling back to CSE
    const studentDept = user?.department || "CSE";

    const response = await conversationAPI.create({
      title,
      department: studentDept,
    });

    return response?.data?.data || response?.data;
  };

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = async (text) => {
    const trimmedText = text.trim();

    if (!trimmedText || loading) {
      return;
    }

    setError("");

    const userMessage = {
      _id: `temp-user-${Date.now()}`,
      role: "user",
      content: trimmedText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      let conversation = activeConversation;

      if (!conversation?._id) {
        conversation = await createConversation(trimmedText);

        setActiveConversation(conversation);

        setConversations((prev) => [conversation, ...prev]);
      }

      const response = await chatAPI.send({
        message: trimmedText,
        conversationId: conversation._id,
      });

      const data =
        response?.data?.data ||
        response?.data ||
        {};

      const assistantText =
        data?.assistantMessage?.content ||
        data?.assistantMessage?.message ||
        data?.message?.content ||
        data?.response ||
        data?.reply ||
        data?.message ||
        "";

      const assistantMessage = {
        _id: `ai-${Date.now()}`,
        role: "assistant",
        content:
          assistantText ||
          "Sorry, I couldn't generate a response. Please try again.",
        sources: data?.sources || data?.message?.sources || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await loadConversations();
    } catch (err) {
      console.error("Chat request failed:");

      const backendMessage =
        err?.response?.data?.message ||
        "Sorry, something went wrong while generating a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          _id: `error-${Date.now()}`,
          role: "assistant",
          content: backendMessage,
          isError: true,
          failedText: trimmedText,
          createdAt: new Date().toISOString(),
        },
      ]);

      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RETRY
  ========================= */

  const handleRetry = (failedText) => {
    if (!failedText) return;

    // Remove the error message if it's the last one
    setMessages((prev) => prev.filter((m) => !m.isError));
    sendMessage(failedText);
  };

  /* =========================
     SUGGESTION
  ========================= */

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="chat-page">
      {/* Mobile menu button */}
      <button
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Sidebar */}
      <Sidebar
        conversations={filteredConversations}
        activeConversation={activeConversation}
        onNewChat={createNewChat}
        onSelectConversation={selectConversation}
        onSearch={() => setSearchOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDeleteConversation={openDeleteDialog}
        onRenameConversation={openRenameDialog}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Chat Area */}
      <div className="chat-main">
        {error && (
          <div className="top-error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}

        <ChatWindow
          messages={messages}
          loading={loading}
          error={error}
          onSuggestionClick={handleSuggestionClick}
          onRetry={handleRetry}
        />

        <ChatInput onSend={sendMessage} loading={loading} />
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="search-modal-overlay"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="search-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="search-modal-header">
              <div>
                <strong>Search chats</strong>
                <span>Find a previous conversation</span>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-input-wrapper">
              <Search size={17} />

              <input
                autoFocus
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search conversations..."
              />
            </div>

            <div className="search-results">
              {filteredConversations.length === 0 ? (
                <div className="search-empty">No conversations found.</div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    type="button"
                    className="search-result"
                    onClick={() => {
                      selectConversation(conversation);
                      setSearchOpen(false);
                    }}
                  >
                    <strong>
                      {conversation.title || "New Chat"}
                    </strong>

                    <span>{conversation.department || "CSE"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenProfile={() => {
          setSettingsOpen(false);
          setProfileOpen(true);
        }}
      />

      {/* Rename Dialog */}
      <RenameDialog
        open={renameModal.open}
        initialTitle={renameModal.title}
        loading={renameModal.loading}
        error={renameModal.error}
        onClose={() =>
          setRenameModal({
            open: false,
            id: null,
            title: "",
            loading: false,
            error: "",
          })
        }
        onSubmit={handleConfirmRename}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteModal.open}
        title="Delete conversation?"
        description="This will permanently delete this chat history. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onClose={() =>
          setDeleteModal({ open: false, id: null, loading: false })
        }
      />
    </div>
  );
};

export default Chat;
