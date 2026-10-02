export default function UnreadBadge({ count, label, floating = false }) {
  const unreadCount = Number(count) || 0;
  if (unreadCount <= 0) return null;

  const displayCount = unreadCount >= 10 ? '9+' : String(unreadCount);
  return (
    <span
      className={`unread-content-badge${floating ? ' unread-content-badge--floating' : ''}`}
      aria-label={`${unreadCount} unread ${label}`}
      title={`${unreadCount} unread ${label}`}
    >
      {displayCount}
    </span>
  );
}
