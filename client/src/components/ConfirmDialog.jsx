import React, { useEffect } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";

const ConfirmDialog = ({
  open,
  title = "Delete conversation?",
  description = "Are you sure you want to delete this conversation? This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: "440px",
          width: "90%",
          padding: 0,
          borderRadius: "16px",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div
          className="modal-header"
          style={{
            padding: "20px 20px 16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: danger ? "color-mix(in srgb, var(--color-danger) 12%, transparent)" : "var(--color-primary-light)",
                color: danger ? "var(--color-danger)" : "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {danger ? <Trash2 size={19} /> : <AlertTriangle size={19} />}
            </div>
            <div>
              <h2 id="confirm-dialog-title" style={{ fontSize: "1.08rem", fontWeight: "700", margin: 0 }}>
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: "20px",
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "0.93rem",
            lineHeight: "1.55",
          }}
        >
          <p id="confirm-dialog-description" style={{ margin: 0 }}>{description}</p>
        </div>

        <div
          className="modal-footer"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            backgroundColor: "var(--bg-card-header, rgba(0,0,0,0.1))",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: danger ? "var(--color-danger)" : "var(--color-primary)",
              color: "#ffffff",
              border: "none",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            {danger && <Trash2 size={15} />}
            <span>{loading ? "Deleting..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
