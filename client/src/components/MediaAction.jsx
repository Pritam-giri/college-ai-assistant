import { ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { safeHttpUrl } from '../safeUrl';

const TYPE_BY_EXTENSION = {
  pdf: { label: 'View PDF', kind: 'document' },
  doc: { label: 'Open DOC', kind: 'document' },
  docx: { label: 'Open DOCX', kind: 'document' },
  xls: { label: 'Open XLS', kind: 'document' },
  xlsx: { label: 'Open XLSX', kind: 'document' },
  ppt: { label: 'Open PPT', kind: 'document' },
  pptx: { label: 'Open PPTX', kind: 'document' },
  jpg: { label: 'View image', kind: 'image' },
  jpeg: { label: 'View image', kind: 'image' },
  png: { label: 'View image', kind: 'image' },
  webp: { label: 'View image', kind: 'image' },
};

function describeMedia(url, mimeType, fileName) {
  const mime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (mime === 'application/pdf') return TYPE_BY_EXTENSION.pdf;
  if (mime.startsWith('image/')) return TYPE_BY_EXTENSION.png;
  if (mime.includes('wordprocessingml') || mime === 'application/msword') return TYPE_BY_EXTENSION.docx;
  if (mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel') return TYPE_BY_EXTENSION.xlsx;
  if (mime.includes('presentationml') || mime === 'application/vnd.ms-powerpoint') return TYPE_BY_EXTENSION.pptx;

  const candidate = fileName || (() => {
    try { return new URL(url).pathname; } catch { return ''; }
  })();
  const extension = String(candidate).split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase();
  return TYPE_BY_EXTENSION[extension] || { label: 'Open file', kind: 'document' };
}

export default function MediaAction({ url, mimeType, fileName, className = 'media-action' }) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return null;

  const media = describeMedia(safeUrl, mimeType, fileName);
  const Icon = media.kind === 'image' ? ImageIcon : FileText;
  return (
    <a className={className} href={safeUrl} target="_blank" rel="noopener noreferrer">
      <Icon size={14} aria-hidden="true" />
      <span>{media.label}</span>
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}
