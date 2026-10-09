import { Request, Response, NextFunction } from 'express';
import { trendingService } from './trending.service.js';

export class TrendingController {
  async getTrending(req: Request, res: Response, next: NextFunction) {
    try {
      const country = (req.query.country as string) || 'PK';
      const timeframe = (req.query.timeframe as '1h' | '24h') || '24h';
      const limit = parseInt(req.query.limit as string || '10', 10);

      const topics = await trendingService.getTrending(country, timeframe, limit);
      res.json({ topics, timeframe, country });
    } catch (err) {
      next(err);
    }
  }
}

export const trendingController = new TrendingController();
