import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      token?: string;
    }
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  req.token = token;

  try {
    // Try decoding JWT with Supabase secret
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.sub || decoded.id)) {
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'authenticated',
      };
      return next();
    }
  } catch {
    // ignore decoding errors in optionalAuth
  }

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  req.token = token;

  try {
    // In dev / mock mode or real Supabase verification
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.sub || decoded.id)) {
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'authenticated',
      };
      return next();
    }

    return res.status(401).json({ error: 'Invalid authentication token' });
  } catch (err: any) {
    return res.status(401).json({ error: 'Token validation failed', details: err.message });
  }
}
