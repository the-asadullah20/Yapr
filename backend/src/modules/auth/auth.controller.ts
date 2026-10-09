import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';

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
      const { email } = req.body;
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
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, reset code, and new password are required' });
      }
      const result = await authService.resetPassword(email, code, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to reset password' });
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
