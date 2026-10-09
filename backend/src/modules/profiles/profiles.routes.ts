import { Router } from 'express';
import { profilesController } from './profiles.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/countries', (req, res) => profilesController.getCountries(req, res));
router.get('/check-username', (req, res, next) => profilesController.checkUsername(req, res, next));
router.get('/:identifier', (req, res, next) => profilesController.getProfile(req, res, next));
router.patch('/me', requireAuth, (req, res, next) => profilesController.updateProfile(req, res, next));

export const profilesRoutes = router;
