import { useEffect, useState } from "react";
import Modal from "./Modal";

const RenameDialog = ({
  open,
  initialTitle = "",
  loading = false,
  error = "",
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
    }
  }, [open, initialTitle]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    onSubmit?.(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rename chat"
      description="Give this conversation a new name."
      footer={
        <>
          <button
            type="button"
            className="modal-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="rename-conversation-form"
            className="modal-button modal-button-primary"
            disabled={loading || !title.trim()}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <form id="rename-conversation-form" onSubmit={handleSubmit}>
        <input
          autoFocus
          type="text"
          className="modal-rename-input"
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Chat name"
        />

        {error && <p className="modal-error-text">{error}</p>}
      </form>
    </Modal>
  );
};

export default RenameDialog;
