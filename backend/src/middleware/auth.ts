import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

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

/**
 * Cryptographically verifies incoming JWT token using SUPABASE_JWT_SECRET
 * or Supabase Admin Auth client, preventing token forgery.
 */
async function verifyJwtToken(token: string): Promise<any> {
  try {
    return jwt.verify(token, env.SUPABASE_JWT_SECRET) as any;
  } catch (verifyErr) {
    // If token was directly issued by Supabase Auth service (OAuth/magic link session)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (data?.user && !error) {
          return {
            sub: data.user.id,
            id: data.user.id,
            email: data.user.email,
            role: 'authenticated',
          };
        }
      } catch {}
    }
    throw verifyErr;
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
    const verified = await verifyJwtToken(token);
    if (verified && (verified.sub || verified.id)) {
      req.user = {
        id: verified.sub || verified.id,
        email: verified.email,
        role: verified.role || 'authenticated',
      };
    }
  } catch {
    // Ignore invalid tokens in optionalAuth (treated as unauthenticated guest)
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
    const verified = await verifyJwtToken(token);
    if (verified && (verified.sub || verified.id)) {
      req.user = {
        id: verified.sub || verified.id,
        email: verified.email,
        role: verified.role || 'authenticated',
      };
      return next();
    }

    return res.status(401).json({ error: 'Invalid or forged authentication token' });
  } catch (err: any) {
    return res.status(401).json({ error: 'Token verification failed. Please sign in again.', details: err.message });
  }
}
