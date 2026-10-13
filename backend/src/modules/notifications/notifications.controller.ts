import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service.js';
import { webPushService } from './webpush.service.js';

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

  async getVapidPublicKey(_req: Request, res: Response, next: NextFunction) {
    try {
      const publicKey = webPushService.getPublicKey();
      res.json({ publicKey });
    } catch (err) {
      next(err);
    }
  }

  async subscribePush(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Valid PushSubscription is required' });
      }
      await webPushService.saveSubscription(req.user.id, subscription);
      res.json({ success: true, message: 'Push subscription registered successfully' });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribePush(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { endpoint } = req.body || {};
      await webPushService.removeSubscription(req.user.id, endpoint);
      res.json({ success: true, message: 'Push subscription removed' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
