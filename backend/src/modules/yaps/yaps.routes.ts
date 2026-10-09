import { Router } from 'express';
import { yapsController } from './yaps.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { yapPostLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/', requireAuth, yapPostLimiter, (req, res, next) => yapsController.createYap(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => yapsController.getYap(req, res, next));
router.get('/:id/replies', (req, res, next) => yapsController.getReplies(req, res, next));
router.patch('/:id', requireAuth, (req, res, next) => yapsController.editYap(req, res, next));
router.delete('/:id', requireAuth, (req, res, next) => yapsController.deleteYap(req, res, next));

export const yapsRoutes = router;
