import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { contentReadAPI } from '../services/api';

const EMPTY_COUNTS = { notices: 0, assignments: 0, practicals: 0 };
const UnreadContentContext = createContext(null);

export function UnreadContentProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCounts, setUnreadCounts] = useState(EMPTY_COUNTS);
  const activeUserId = useRef(user?._id);
  activeUserId.current = user?._id;

  const refreshUnreadCounts = useCallback(async () => {
    const requestUserId = user?._id;
    if (!requestUserId) return;
    try {
      const response = await contentReadAPI.getUnreadCounts();
      const counts = response.data?.data;
      if (counts && activeUserId.current === requestUserId) {
        setUnreadCounts({
          notices: Number(counts.notices) || 0,
          assignments: Number(counts.assignments) || 0,
          practicals: Number(counts.practicals) || 0,
        });
      }
    } catch (error) {
      console.warn('Unread content counts are temporarily unavailable', {
        status: error.response?.status,
      });
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) {
      setUnreadCounts(EMPTY_COUNTS);
      return undefined;
    }

    setUnreadCounts(EMPTY_COUNTS);
    refreshUnreadCounts();
    const interval = window.setInterval(refreshUnreadCounts, 60_000);
    window.addEventListener('focus', refreshUnreadCounts);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshUnreadCounts);
    };
  }, [user?._id, location.pathname, refreshUnreadCounts]);

  const markContentRead = useCallback(async (contentType, contentId) => {
    if (!user?._id || !contentId) return null;
    try {
      const response = await contentReadAPI.markRead(contentType, contentId);
      const result = response.data?.data;
      if (result && !result.alreadyRead && activeUserId.current === user?._id) {
        const category = contentType === 'notice' ? 'notices' : `${contentType}s`;
        setUnreadCounts((current) => ({
          ...current,
          [category]: Math.max(0, current[category] - 1),
        }));
      }
      return result || null;
    } catch (error) {
      console.warn('Could not mark content as read', {
        contentType,
        status: error.response?.status,
      });
      return null;
    }
  }, [user?._id]);

  return (
    <UnreadContentContext.Provider value={{ unreadCounts, markContentRead, refreshUnreadCounts }}>
      {children}
    </UnreadContentContext.Provider>
  );
}

export function useUnreadContent() {
  const context = useContext(UnreadContentContext);
  if (!context) throw new Error('useUnreadContent must be used inside UnreadContentProvider.');
  return context;
}
