import dotenv from 'dotenv';
import path from 'path';

// Load .env with multi-path fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://mock-yapr-supabase.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-yapr-123456',

  // Redis / Upstash
  REDIS_URL: process.env.REDIS_URL || '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // LavinMQ / CloudAMQP
  LAVINMQ_URL: process.env.LAVINMQ_URL || 'amqp://guest:guest@localhost:5672',
  AMQP_QUEUE_YAP_CREATED: process.env.AMQP_QUEUE_YAP_CREATED || 'yapr.yap.created',
  AMQP_QUEUE_NOTIFICATIONS: process.env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications',
  AMQP_QUEUE_EMAIL_OTP: process.env.AMQP_QUEUE_EMAIL_OTP || 'yapr.email.otp',
  AMQP_QUEUE_AI_SUMMARY: process.env.AMQP_QUEUE_AI_SUMMARY || 'yapr.ai.summary',

  // AI
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',

  // Email (HTTP Providers & SMTP)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '"Yapr" <no-reply@yapr.app>',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};
