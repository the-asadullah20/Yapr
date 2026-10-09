import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service.js';

export class MediaController {
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No avatar image file provided' });
      }

      const result = await mediaService.uploadAvatar(req.user.id, req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async uploadPostMedia(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No media file provided' });
      }

      const result = await mediaService.uploadPostMedia(req.user.id, req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();
