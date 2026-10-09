import { Request, Response, NextFunction } from 'express';
import { yapsService } from './yaps.service.js';

export class YapsController {
  async createYap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const { body, parentId, media, taggedLabel, countryCode } = req.body;
      const yap = await yapsService.createYap({
        authorId: req.user.id,
        body,
        parentId,
        media,
        taggedLabel,
        countryCode: countryCode || 'PK',
      });
      res.status(201).json({ yap });
    } catch (err) {
      next(err);
    }
  }

  async getYap(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const yap = await yapsService.getYapById(id, req.user?.id);
      res.json({ yap });
    } catch (err) {
      next(err);
    }
  }

  async getReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const replies = await yapsService.getThreadReplies(id);
      res.json({ replies });
    } catch (err) {
      next(err);
    }
  }

  async deleteYap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { id } = req.params;
      await yapsService.softDeleteYap(id, req.user.id);
      res.json({ success: true, message: 'Yap deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async editYap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { id } = req.params;
      const { body } = req.body;
      const updated = await yapsService.editYap(id, req.user.id, body);
      res.json({ yap: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const yapsController = new YapsController();
