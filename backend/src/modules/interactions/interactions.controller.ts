import { Request, Response, NextFunction } from 'express';
import { interactionsService } from './interactions.service.js';

export class InteractionsController {
  async batchLog(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { events } = req.body;
      const count = await interactionsService.batchLogInteractions(req.user.id, events);
      res.json({ success: true, count });
    } catch (err) {
      next(err);
    }
  }
}

export const interactionsController = new InteractionsController();
