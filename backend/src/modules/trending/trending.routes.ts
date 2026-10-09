import { Router } from 'express';
import { trendingController } from './trending.controller.js';

const router = Router();

router.get('/', (req, res, next) => trendingController.getTrending(req, res, next));

export const trendingRoutes = router;
