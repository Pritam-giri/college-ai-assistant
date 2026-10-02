import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { safeHttpUrl } from "../safeUrl";
import "./OptionalImageField.css";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export default function OptionalImageField({
  image,
  file,
  removeExisting,
  onFileChange,
  onRemoveExisting,
  onRestoreExisting,
  error,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(selectedFile.type) && !ALLOWED_EXTENSIONS.has(extension)) {
      event.target.value = "";
      onFileChange(null, "Choose a JPEG, PNG, or WebP image.");
      return;
    }
    onFileChange(selectedFile, "");
  };

  const storedUrl = !removeExisting ? safeHttpUrl(image?.url) : "";
  const shownUrl = file ? previewUrl : storedUrl;

  return (
    <div className="admin-form-group optional-image-field">
      <label className="admin-form-label" htmlFor="academic-image-upload">Photo / Image</label>
      <div className="optional-image-controls">
        <input
          ref={inputRef}
          id="academic-image-upload"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          aria-describedby="academic-image-help"
        />
        {file && (
          <button
            className="admin-btn admin-btn-secondary optional-image-action"
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onFileChange(null, "");
            }}
          >
            <X size={14} /> Discard selection
          </button>
        )}
        {!file && image?.url && !removeExisting && (
          <button
            className="admin-btn admin-btn-secondary optional-image-action"
            type="button"
            onClick={onRemoveExisting}
          >
            <X size={14} /> Remove current image
          </button>
        )}
        {removeExisting && image?.url && (
          <button
            className="admin-btn admin-btn-secondary optional-image-action"
            type="button"
            onClick={onRestoreExisting}
          >
            <RotateCcw size={14} /> Keep current image
          </button>
        )}
      </div>
      <small className="optional-image-help" id="academic-image-help">
        <ImagePlus size={13} aria-hidden="true" /> Optional · JPEG, PNG, or WebP · up to 5 MB
      </small>
      {shownUrl && (
        <div className="optional-image-preview">
          <img src={shownUrl} alt={file ? "Selected image preview" : "Current uploaded image"} />
          <span>{file?.name || image?.fileName || "Current image"}</span>
        </div>
      )}
      {error && <small className="optional-image-error" role="alert">{error}</small>}
    </div>
  );
}
