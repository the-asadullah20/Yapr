import { Router } from 'express';
import { interactionsController } from './interactions.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/batch', requireAuth, (req, res, next) => interactionsController.batchLog(req, res, next));

export const interactionsRoutes = router;
