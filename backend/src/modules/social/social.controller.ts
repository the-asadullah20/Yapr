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

  async getBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const yaps = await socialService.getBookmarkedYaps(req.user.id);
      res.json({ yaps });
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

  async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { userId } = req.params;
      await socialService.unblockUser(req.user.id, userId);
      res.json({ success: true, message: 'User unblocked' });
    } catch (err) {
      next(err);
    }
  }

  async getBlockedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const blocks = await socialService.getBlockedUsers(req.user.id);
      res.json({ blocks });
    } catch (err) {
      next(err);
    }
  }

  async isUserBlocked(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { userId } = req.params;
      const isBlocked = await socialService.isUserBlocked(req.user.id, userId);
      res.json({ isBlocked });
    } catch (err) {
      next(err);
    }
  }

  async getUserReports(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const reports = await socialService.getUserReports(req.user.id);
      res.json({ reports });
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

  async getYapLikers(req: Request, res: Response, next: NextFunction) {
    try {
      const { yapId } = req.params;
      const likers = await socialService.getYapLikers(yapId);
      res.json({ likers });
    } catch (err) {
      next(err);
    }
  }

  async getFollowRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const requests = await socialService.getFollowRequests(req.user.id);
      res.json({ requests });
    } catch (err) {
      next(err);
    }
  }

  async acceptFollowRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { requesterId } = req.params;
      const result = await socialService.acceptFollowRequest(req.user.id, requesterId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async rejectFollowRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { requesterId } = req.params;
      const result = await socialService.rejectFollowRequest(req.user.id, requesterId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async removeFollower(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { followerId } = req.params;
      const result = await socialService.removeFollower(req.user.id, followerId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const socialController = new SocialController();
