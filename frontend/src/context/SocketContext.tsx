import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { NotificationItem } from '../types';
import { api } from '../api/apiClient';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadCount: number;
  latestNotification: NotificationItem | null;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (token) {
      api.getNotifications()
        .then((res) => setUnreadCount(res.unreadCount))
        .catch(() => setUnreadCount(0));
    } else {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    let s: Socket | null = null;
    try {
      s = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      s.on('connect', () => {
        setIsConnected(true);
        console.log('[Socket] Connected to Yapr backend');
      });

      s.on('disconnect', () => {
        setIsConnected(false);
      });

      s.on('notification:new', (notif: NotificationItem) => {
        setLatestNotification(notif);
        setUnreadCount((prev) => prev + 1);

        // If browser notification permission is granted, show OS notification popup
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Yapr', {
              body: notif.formatted_text || 'You have a new notification on Yapr',
              icon: notif.actors?.[0]?.avatar_url || '/logo.png',
              tag: notif.id,
            });
          } catch {
            // Notification display error or blocked by OS
          }
        }
      });

      setSocket(s);
    } catch (err) {
      console.warn('Socket connection skipped in dev:', err);
    }

    return () => {
      s?.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        latestNotification,
        setUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
