import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { NotificationItem } from '../types';

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
  const [unreadCount, setUnreadCount] = useState(1);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);

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
        console.log('⚡ Socket connected to Yapr backend');
      });

      s.on('disconnect', () => {
        setIsConnected(false);
      });

      s.on('notification:new', (notif: NotificationItem) => {
        setLatestNotification(notif);
        setUnreadCount((prev) => prev + 1);
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
