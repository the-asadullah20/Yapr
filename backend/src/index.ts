import express from 'express';
import http from 'http';
import cors from 'cors';
import { env } from './config/env.js';
import { isSupabaseConfigured } from './config/supabase.js';
import { cacheClient } from './config/redis.js';
import { queueService } from './config/queue.js';
import { setupSocketIO } from './realtime/socket.js';
import { initWorkers } from './workers/index.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { profilesRoutes } from './modules/profiles/profiles.routes.js';
import { yapsRoutes } from './modules/yaps/yaps.routes.js';
import { feedRoutes } from './modules/feed/feed.routes.js';
import { socialRoutes } from './modules/social/social.routes.js';
import { trendingRoutes } from './modules/trending/trending.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { interactionsRoutes } from './modules/interactions/interactions.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = setupSocketIO(server);

// Middleware
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Keep-Alive Ping for UptimeRobot / Cron Monitors
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Yapr Backend is live and running',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive Health Check for UptimeRobot & Cloud Load Balancers
const handleHealthCheck = async (req: express.Request, res: express.Response) => {
  let redisStatus = 'mock';
  try {
    await cacheClient.set('health:ping', 'pong', 5);
    const pong = await cacheClient.get('health:ping');
    redisStatus = pong === 'pong' ? 'healthy' : 'degraded';
  } catch {
    redisStatus = 'error';
  }

  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    version: '1.0.0',
    service: 'Yapr API',
    database: isSupabaseConfigured ? 'supabase-connected' : 'mock-active',
    redis: redisStatus,
    queue: queueService.connected ? 'lavinmq-connected' : 'in-memory-active',
    ai: {
      groq: !!env.GROQ_API_KEY,
      gemini: !!env.GEMINI_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

// Mount modular routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/yaps', yapsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/media', mediaRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server and workers
async function startServer() {
  try {
    await initWorkers();

    server.listen(env.PORT, () => {
      console.log(`
🚀 ============================================
    YAPR BACKEND RUNNING ON PORT ${env.PORT}
    Environment: ${env.NODE_ENV}
    Frontend URL: ${env.FRONTEND_URL}
    Supabase: ${isSupabaseConfigured ? 'Connected' : 'Mock/Dev Mode'}
    Redis: ${env.UPSTASH_REDIS_REST_URL ? 'Upstash REST' : (env.REDIS_URL ? 'Standard' : 'In-Memory Cache')}
    AI Models: Groq (${env.GROQ_MODEL}) | Gemini (${env.GEMINI_MODEL})
============================================ 🚀
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export { app, server, io };
