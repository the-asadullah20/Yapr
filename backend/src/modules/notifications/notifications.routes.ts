import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (req, res, next) => notificationsController.getNotifications(req, res, next));
router.post('/mark-read', requireAuth, (req, res, next) => notificationsController.markAsRead(req, res, next));

// Web Push Notification Endpoints
router.get('/vapid-public-key', (req, res, next) => notificationsController.getVapidPublicKey(req, res, next));
router.post('/push-subscribe', requireAuth, (req, res, next) => notificationsController.subscribePush(req, res, next));
router.post('/push-unsubscribe', requireAuth, (req, res, next) => notificationsController.unsubscribePush(req, res, next));

export const notificationsRoutes = router;
