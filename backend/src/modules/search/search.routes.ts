import { Router } from 'express';
import { searchController } from './search.controller.js';

const router = Router();

router.get('/', (req, res, next) => searchController.search(req, res, next));

export const searchRoutes = router;
