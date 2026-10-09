import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let ioInstance: Server | null = null;
const userSocketMap = new Map<string, Set<string>>();

export function setupSocketIO(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Authentication middleware for Sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      // Allow guest socket connection for public feed updates
      return next();
    }

    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && (decoded.sub || decoded.id)) {
        socket.data.userId = decoded.sub || decoded.id;
        return next();
      }
    } catch {
      // Proceed unauthenticated
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set());
      }
      userSocketMap.get(userId)!.add(socket.id);
      // Join private user room for targeted notifications
      socket.join(`user:${userId}`);
      console.log(`🔌 [Socket.io] User connected: ${userId} (socket: ${socket.id})`);
    }

    // Join public feed room
    socket.join('room:public_feed');

    socket.on('disconnect', () => {
      if (userId && userSocketMap.has(userId)) {
        userSocketMap.get(userId)!.delete(socket.id);
        if (userSocketMap.get(userId)!.size === 0) {
          userSocketMap.delete(userId);
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Emit an event to a specific user (all their active tabs/devices)
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Broadcast event to public feed room (e.g. new yap banner)
 */
export function broadcastToFeed(event: string, data: any): void {
  if (ioInstance) {
    ioInstance.to('room:public_feed').emit(event, data);
  }
}
