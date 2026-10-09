import { Router } from 'express';
import { feedController } from './feed.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, (req, res, next) => feedController.getFeed(req, res, next));

export const feedRoutes = router;
