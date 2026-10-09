import { Request, Response, NextFunction } from 'express';
import { feedService } from './feed.service.js';

export class FeedController {
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = (req.query.mode as string) || 'ranked'; // 'ranked' | 'chronological'
      const limit = parseInt(req.query.limit as string || '20', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);
      const countryCode = req.query.country as string;

      if (mode === 'chronological') {
        const feed = await feedService.getChronologicalFeed(req.user?.id, limit, offset);
        return res.json(feed);
      }

      const followingWeight = parseFloat(req.query.followingWeight as string || '1.5');
      const viralWeight = parseFloat(req.query.viralWeight as string || '1.0');
      const recencyHalfLifeHours = parseFloat(req.query.recencyHours as string || '12.0');

      const feed = await feedService.getRankedFeed(req.user?.id, {
        followingWeight,
        viralWeight,
        recencyHalfLifeHours,
        countryCode,
        limit,
        offset,
      });

      res.json(feed);
    } catch (err) {
      next(err);
    }
  }
}

export const feedController = new FeedController();
