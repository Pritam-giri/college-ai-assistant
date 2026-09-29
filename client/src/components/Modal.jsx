import { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`modal-panel ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        {(title || onClose) && (
          <div className="modal-header">
            <div>
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>

            {onClose && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
