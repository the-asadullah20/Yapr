import { Router } from 'express';
import { socialController } from './social.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/like/:yapId', requireAuth, (req, res, next) => socialController.toggleLike(req, res, next));
router.post('/reyap/:yapId', requireAuth, (req, res, next) => socialController.toggleReyap(req, res, next));
router.post('/follow/:followeeId', requireAuth, (req, res, next) => socialController.toggleFollow(req, res, next));
router.post('/bookmark/:yapId', requireAuth, (req, res, next) => socialController.toggleBookmark(req, res, next));
router.post('/block/:userId', requireAuth, (req, res, next) => socialController.blockUser(req, res, next));
router.post('/report', requireAuth, (req, res, next) => socialController.report(req, res, next));

export const socialRoutes = router;
