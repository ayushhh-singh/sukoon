import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, CheckCheck, FileText, Pill, Calendar, X, Trash2 } from 'lucide-react';
import { notifications as notificationsApi } from '../services/api';
import { useRealtimeSubscription } from '../contexts/RealtimeContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  referenceType: string | null;
  isRead: number;
  createdAt: string;
}

interface NotificationBellProps {
  onNavigate?: (tab: string) => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationsApi.unreadCount();
      setUnreadCount(data.count);
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotificationsList(data as unknown as Notification[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Real-time: update instantly when a new notification arrives
  useRealtimeSubscription('notification:new', () => {
    fetchUnreadCount();
    if (showPanel) fetchNotifications();
  });

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellBtnRef.current && !bellBtnRef.current.contains(e.target as Node)
      ) {
        setShowPanel(false);
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  function computePanelStyle(): React.CSSProperties {
    if (!bellBtnRef.current) return {};
    const rect = bellBtnRef.current.getBoundingClientRect();
    const panelWidth = 320;
    const gap = 8;

    // Horizontal: align left edge with button, clamp to viewport
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove >= spaceBelow) {
      // Open upward: anchor panel's bottom edge just above the bell button
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + gap,
        left,
        width: panelWidth,
        zIndex: 9999,
      };
    } else {
      // Open downward: anchor panel's top edge just below the bell button
      return {
        position: 'fixed',
        top: rect.bottom + gap,
        left,
        width: panelWidth,
        zIndex: 9999,
      };
    }
  }

  function togglePanel() {
    if (!showPanel) {
      fetchNotifications();
      setPanelStyle(computePanelStyle());
    }
    setShowPanel(!showPanel);
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await notificationsApi.remove(id);
      const deleted = notificationsList.find(n => n.id === id);
      setNotificationsList(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  }

  async function handleClearAll() {
    try {
      await notificationsApi.clearAll();
      setNotificationsList([]);
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function handleNotificationClick(notif: Notification) {
    if (!notif.isRead) {
      handleMarkRead(notif.id);
    }
    if (onNavigate && notif.referenceType) {
      if (notif.referenceType === 'appointment') {
        onNavigate('appointments');
      } else if (notif.referenceType === 'note' || notif.referenceType === 'medication') {
        onNavigate('doctor-input');
      }
    }
    setShowPanel(false);
  }

  function getNotifIcon(type: string) {
    if (type.startsWith('appointment')) return <Calendar size={14} />;
    if (type === 'note_added') return <FileText size={14} />;
    if (type.startsWith('medication') || type.startsWith('dose')) return <Pill size={14} />;
    return <Bell size={14} />;
  }

  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z').getTime();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const panel = showPanel ? (
    <div className="notification-panel" style={panelStyle} ref={panelRef}>
      <div className="notification-panel-header">
        <span className="notification-panel-title">Notifications</span>
        <div className="notification-panel-actions">
          {unreadCount > 0 && (
            <button className="notification-mark-all-btn" onClick={handleMarkAllRead} title="Mark all as read">
              <CheckCheck size={14} />
              <span>Mark read</span>
            </button>
          )}
          {notificationsList.length > 0 && (
            <button className="notification-clear-all-btn" onClick={handleClearAll} title="Clear all notifications">
              <Trash2 size={14} />
              <span>Clear all</span>
            </button>
          )}
        </div>
        <button className="notification-close-btn" onClick={() => setShowPanel(false)}>
          <X size={14} />
        </button>
      </div>

      <div className="notification-panel-list">
        {loading && <div className="notification-loading">Loading...</div>}
        {!loading && notificationsList.length === 0 && (
          <div className="notification-empty">No notifications yet</div>
        )}
        {!loading && notificationsList.map(notif => (
          <div
            key={notif.id}
            className={`notification-item ${notif.isRead ? '' : 'notification-unread'}`}
            onClick={() => handleNotificationClick(notif)}
          >
            <div className="notification-item-icon">{getNotifIcon(notif.type)}</div>
            <div className="notification-item-content">
              <span className="notification-item-title">{notif.title}</span>
              <span className="notification-item-message">{notif.message}</span>
              <span className="notification-item-time">{timeAgo(notif.createdAt)}</span>
            </div>
            <div className="notification-item-btns">
              {!notif.isRead && (
                <button
                  className="notification-item-read-btn"
                  onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                  title="Mark as read"
                >
                  <Check size={12} />
                </button>
              )}
              <button
                className="notification-item-delete-btn"
                onClick={(e) => handleDelete(e, notif.id)}
                title="Delete notification"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="notification-bell-container">
      <button ref={bellBtnRef} className="notification-bell-btn" onClick={togglePanel} title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
