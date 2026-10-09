import { Request, Response, NextFunction } from 'express';
import { socialService } from './social.service.js';

export class SocialController {
  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { yapId } = req.params;
      const result = await socialService.toggleLike(req.user.id, yapId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleReyap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { yapId } = req.params;
      const { quoteBody } = req.body;
      const result = await socialService.toggleReyap(req.user.id, yapId, quoteBody);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleFollow(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { followeeId } = req.params;
      const result = await socialService.toggleFollow(req.user.id, followeeId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { yapId } = req.params;
      const result = await socialService.toggleBookmark(req.user.id, yapId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { userId } = req.params;
      await socialService.blockUser(req.user.id, userId);
      res.json({ success: true, message: 'User blocked' });
    } catch (err) {
      next(err);
    }
  }

  async report(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { yapId, reportedUserId, reason } = req.body;
      await socialService.reportContent(req.user.id, { yapId, reportedUserId, reason });
      res.json({ success: true, message: 'Report submitted for review' });
    } catch (err) {
      next(err);
    }
  }
}

export const socialController = new SocialController();
