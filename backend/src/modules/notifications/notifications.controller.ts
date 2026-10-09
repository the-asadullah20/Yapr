import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service.js';

export class NotificationsController {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const data = await notificationsService.getNotifications(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      await notificationsService.markAllAsRead(req.user.id);
      res.json({ success: true, message: 'Notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
