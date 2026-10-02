import { useCallback, useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const ChatInput = ({
  onSend,
  loading = false,
  disabled = false,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const prevLoadingRef = useRef(loading);
  const { enterToSend } = useSettings();

  // Helper to safely focus textarea without scrolling or stealing modal focus
  const focusInput = useCallback(() => {
    const hasOpenModal = Boolean(
      document.querySelector(
        ".modal-overlay, .admin-modal-overlay, .notices-modal-backdrop, .search-modal-overlay"
      )
    );
    if (!hasOpenModal && textareaRef.current && !disabled && !loading) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus({ preventScroll: true });
      });
    }
  }, [disabled, loading]);

  // Focus on initial mount
  useEffect(() => {
    if (window.innerWidth > 768) {
      focusInput();
    }
  }, [focusInput]);

  // Focus when AI finishes generating response
  useEffect(() => {
    if (prevLoadingRef.current && !loading && !disabled) {
      focusInput();
    }
    prevLoadingRef.current = loading;
  }, [focusInput, loading, disabled]);

  const handleSubmit = (e) => {
    e?.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading || disabled) {
      return;
    }

    onSend?.(trimmedMessage);

    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    focusInput();
  };

  const handleKeyDown = (e) => {
    if (enterToSend) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);

    const textarea = e.target;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      160
    )}px`;
  };

  const clearMessage = () => {
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const hasMessage = message.trim().length > 0;

  return (
    <div className="chat-input-area">
      <form
        className="chat-input-wrapper"
        onSubmit={handleSubmit}
      >
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            enterToSend
              ? "Ask anything about your college... (Enter to send)"
              : "Ask anything about your college... (Ctrl+Enter to send)"
          }
          rows={1}
          disabled={loading || disabled}
          className="chat-textarea"
        />

        {/* Clear Button */}
        {hasMessage && !loading && (
          <button
            type="button"
            className="input-clear-button"
            onClick={clearMessage}
            title="Clear message"
          >
            <X size={17} />
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          className={`send-button ${
            hasMessage ? "send-active" : ""
          }`}
          disabled={
            !hasMessage ||
            loading ||
            disabled
          }
          title="Send message"
        >
          <Send size={18} />
        </button>
      </form>

      <div className="input-disclaimer">
        College Chatbot can make mistakes. Verify important
        information with your college administration.
      </div>
    </div>
  );
};

export default ChatInput;
