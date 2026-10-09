import React, { useState, useEffect } from 'react';
import { Bell, Heart, Repeat, UserPlus, CheckCheck } from 'lucide-react';
import { api } from '../api/apiClient';
import { NotificationItem } from '../types';
import { useSocket } from '../context/SocketContext';
import { formatTimeAgo } from '../utils/formatters';

interface NotificationsPageProps {
  onOpenProfile?: (username: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onOpenProfile }) => {
  const { setUnreadCount } = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications().then((res: { notifications: NotificationItem[]; unreadCount: number }) => {
      setNotifications(res.notifications);
      setLoading(false);
    });
  }, []);

  const handleMarkAllRead = async () => {
    await api.markNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'reyap':
        return <Repeat className="w-4 h-4 text-emerald-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h2>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-10 text-xs text-slate-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">You have no new notifications.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                !n.read_at
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {n.actors && n.actors.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden cursor-pointer">
                      {n.actors.slice(0, 3).map((a, i) => (
                        <img
                          key={i}
                          src={a.avatar_url}
                          alt={a.display_name}
                          onClick={() => onOpenProfile?.(a.username)}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover hover:scale-110 transition-transform"
                        />
                      ))}
                    </div>
                  )}
                  <span
                    onClick={() => {
                      if (n.actors && n.actors[0]?.username) {
                        onOpenProfile?.(n.actors[0].username);
                      }
                    }}
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {n.formatted_text || `${n.type} notification`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formatTimeAgo(n.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
