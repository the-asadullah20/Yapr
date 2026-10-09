import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/summarize', optionalAuth, (req, res, next) => aiController.summarize(req, res, next));
router.post('/translate', optionalAuth, (req, res, next) => aiController.translate(req, res, next));
router.post('/polish', optionalAuth, (req, res, next) => aiController.polish(req, res, next));

export const aiRoutes = router;
