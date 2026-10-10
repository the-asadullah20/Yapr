import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from './auth.service.js';
import { env } from '../../config/env.js';

export class AuthController {
  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }
      const result = await authService.requestEmailOtp(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: 'Email and 6-digit code are required' });
      }
      const result = await authService.verifyEmailOtp(email, code);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Verification failed' });
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, username, displayName, countryCode } = req.body;
      if (!email || !password || !username) {
        return res.status(400).json({ error: 'Email, password, and username are required' });
      }
      const result = await authService.registerWithPassword({
        email,
        password,
        username,
        displayName,
        countryCode,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const result = await authService.loginWithPassword(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed' });
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      let email = req.body?.email;
      if (!email && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded: any = jwt.verify(token, env.SUPABASE_JWT_SECRET);
          if (decoded?.email) email = decoded.email;
        } catch {
          // ignore
        }
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }
      const result = await authService.requestPasswordReset(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process request' });
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      let { email, code, newPassword } = req.body;
      if (!email && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded: any = jwt.verify(token, env.SUPABASE_JWT_SECRET);
          if (decoded?.email) email = decoded.email;
        } catch {
          // ignore
        }
      }

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, reset code, and new password are required' });
      }
      const result = await authService.resetPassword(email, code, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to reset password' });
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword({
        userId: req.user.id,
        email: req.user.email,
        currentPassword,
        newPassword,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to change password' });
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const fullProfile = await authService.getMeProfile(req.user.id, req.user.email);
      res.json({ user: fullProfile });
    } catch (err) {
      next(err);
    }
  }

  async oauthSync(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const metadata = req.body?.metadata || {};
      const user = await authService.syncOAuthUser(req.user.id, req.user.email || '', metadata);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
