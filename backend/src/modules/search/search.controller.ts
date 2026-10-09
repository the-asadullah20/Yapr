import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service.js';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '');
      const type = (req.query.type as 'all' | 'yaps' | 'users' | 'hashtags') || 'all';
      const limit = parseInt(req.query.limit as string || '20', 10);

      const data = await searchService.search(q, type, limit);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
