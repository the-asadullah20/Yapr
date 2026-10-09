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
    } catch (err) {
      next(err);
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
